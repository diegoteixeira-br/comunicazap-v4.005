-- Add RLS policies to message_logs to prevent unauthorized writes
-- Only the edge function using SERVICE_ROLE_KEY should be able to INSERT/UPDATE/DELETE
-- Regular users can only SELECT their own logs (policy already exists)

-- Policy to prevent any INSERT by authenticated users
-- The edge function uses SERVICE_ROLE_KEY which bypasses RLS
CREATE POLICY "Prevent user inserts on message logs"
ON public.message_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Policy to prevent any UPDATE by authenticated users
CREATE POLICY "Prevent user updates on message logs"
ON public.message_logs
FOR UPDATE
TO authenticated
USING (false);

-- Policy to prevent any DELETE by authenticated users
CREATE POLICY "Prevent user deletes on message logs"
ON public.message_logs
FOR DELETE
TO authenticated
USING (false);

COMMENT ON POLICY "Prevent user inserts on message logs" ON public.message_logs 
IS 'Message logs are immutable audit records. Only edge functions with SERVICE_ROLE_KEY can insert.';

COMMENT ON POLICY "Prevent user updates on message logs" ON public.message_logs 
IS 'Message logs cannot be modified to maintain audit trail integrity.';

COMMENT ON POLICY "Prevent user deletes on message logs" ON public.message_logs 
IS 'Message logs cannot be deleted to maintain audit trail integrity.';