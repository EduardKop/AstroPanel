-- Добавляем внешний ключ к таблице managers
ALTER TABLE public.work_shifts 
ADD CONSTRAINT work_shifts_manager_id_fkey 
FOREIGN KEY (manager_id) 
REFERENCES public.managers(id) 
ON DELETE CASCADE;

-- Обновляем схему
NOTIFY pgrst, 'reload schema cache';
