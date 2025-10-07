import { useState, useEffect, useCallback } from 'react';

type UseFormReturn<T> = {
  formState: T;
  handleChange: (field: keyof T, value: any) => void;
  resetForm: () => void;
  setFormState: React.Dispatch<React.SetStateAction<T>>;
};

export function useForm<T extends object>(
  getInitialState: () => T,
  deps: readonly any[] = []
): UseFormReturn<T> {
  const [formState, setFormState] = useState<T>(getInitialState);

  useEffect(() => {
    setFormState(getInitialState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const handleChange = useCallback((field: keyof T, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(getInitialState());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { formState, setFormState, handleChange, resetForm };
}
