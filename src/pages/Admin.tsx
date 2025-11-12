import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Search, CheckSquare, XSquare, Clock, Users, Filter, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UserWithSubscription {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  subscription: {
    status: string;
    trial_active: boolean;
    trial_ends_at: string | null;
    current_period_end: string | null;
  } | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithSubscription[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [trialDays, setTrialDays] = useState('7');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Buscar todos os perfis
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Buscar todas as assinaturas
      const { data: subscriptions, error: subsError } = await supabase
        .from('user_subscriptions')
        .select('user_id, status, trial_active, trial_ends_at, current_period_end');

      if (subsError) throw subsError;

      // Combinar dados
      const usersWithSubs: UserWithSubscription[] = (profiles || []).map(profile => {
        const sub = subscriptions?.find(s => s.user_id === profile.id);
        return {
          ...profile,
          subscription: sub || null,
        };
      });

      setUsers(usersWithSubs);
      setFilteredUsers(usersWithSubs);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users;

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        if (statusFilter === 'active') return user.subscription?.status === 'active';
        if (statusFilter === 'trial') return user.subscription?.trial_active;
        if (statusFilter === 'inactive') return !user.subscription || user.subscription.status === 'inactive';
        return true;
      });
    }

    setFilteredUsers(filtered);
  }, [searchTerm, statusFilter, users]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    const newSelected = new Set(selectedUsers);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleBulkAction = async (action: 'activate_trial' | 'deactivate_trial' | 'extend_trial') => {
    if (selectedUsers.size === 0) {
      toast.error('Selecione ao menos um usuário');
      return;
    }

    setBulkActionLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const days = action === 'extend_trial' ? parseInt(trialDays) : parseInt(trialDays);

      const { data, error } = await supabase.functions.invoke('admin-manage-trials', {
        body: {
          action,
          user_ids: Array.from(selectedUsers),
          days,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(data.message);
      setSelectedUsers(new Set());
      await fetchUsers();
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Erro ao executar ação em lote');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getStatusBadge = (user: UserWithSubscription) => {
    const sub = user.subscription;
    
    if (!sub) {
      return <Badge variant="outline">Sem assinatura</Badge>;
    }

    if (sub.status === 'active') {
      return <Badge className="bg-green-500">Ativo</Badge>;
    }

    if (sub.trial_active) {
      const daysLeft = sub.trial_ends_at 
        ? Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;
      return <Badge className="bg-blue-500">Trial ({daysLeft}d)</Badge>;
    }

    return <Badge variant="secondary">Inativo</Badge>;
  };

  const stats = {
    total: users.length,
    active: users.filter(u => u.subscription?.status === 'active').length,
    trial: users.filter(u => u.subscription?.trial_active).length,
    inactive: users.filter(u => !u.subscription || u.subscription.status === 'inactive').length,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Painel Administrativo</h1>
          <p className="text-muted-foreground">Gerenciar usuários, trials e assinaturas</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/')}>
          Voltar ao Dashboard
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <CheckSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Trial</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trial}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inativos</CardTitle>
            <XSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Ações */}
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Usuários</CardTitle>
          <CardDescription>
            Buscar, filtrar e executar ações em lote
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="trial">Em Trial</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {/* Ações em lote */}
          {selectedUsers.size > 0 && (
            <div className="flex flex-wrap gap-2 items-center p-4 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedUsers.size} usuário(s) selecionado(s)
              </span>
              
              <Input
                type="number"
                min="1"
                max="365"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
                className="w-20"
                placeholder="Dias"
              />

              <Button
                size="sm"
                onClick={() => handleBulkAction('activate_trial')}
                disabled={bulkActionLoading}
              >
                Ativar Trial
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleBulkAction('extend_trial')}
                disabled={bulkActionLoading}
              >
                Estender Trial
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkAction('deactivate_trial')}
                disabled={bulkActionLoading}
              >
                Desativar Trial
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela de Usuários */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Trial expira</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedUsers.has(user.id)}
                        onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name || '-'}</TableCell>
                    <TableCell>{getStatusBadge(user)}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      {user.subscription?.trial_ends_at
                        ? new Date(user.subscription.trial_ends_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}