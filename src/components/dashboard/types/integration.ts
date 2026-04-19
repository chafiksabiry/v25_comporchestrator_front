export interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'connected' | 'error' | 'pending';
  icon_url: string;
  config?: {
    fields: ConfigField[];
  };
}

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  validation?: (value: string) => string | undefined;
} 
