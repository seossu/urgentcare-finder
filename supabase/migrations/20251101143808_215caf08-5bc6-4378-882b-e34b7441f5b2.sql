-- Create health_info table
CREATE TABLE public.health_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  height NUMERIC,
  weight NUMERIC,
  age INTEGER,
  sleep_hours NUMERIC,
  menstrual_cycle INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.health_info ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own health info" 
ON public.health_info 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health info" 
ON public.health_info 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health info" 
ON public.health_info 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health info" 
ON public.health_info 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_health_info_updated_at
BEFORE UPDATE ON public.health_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();