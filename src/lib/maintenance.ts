export interface MaintenanceStatus {
  success: boolean;
  enabled: boolean;
  active: boolean;
  upcoming: boolean;
  bypass: boolean;
  clientIp?: string;
  serverNow?: string;
  notifyFromAt?: string;
  startAt?: string;
  endAt?: string;
  message?: string;
}

const getMaintenanceEndpoint = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  return `${String(supabaseUrl).replace(/\/+$/, '')}/functions/v1/get-maintenance-status`;
};

export const getMaintenanceStatus = async (): Promise<MaintenanceStatus> => {
  const endpoint = getMaintenanceEndpoint();
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!endpoint || !anonKey) {
    return {
      success: false,
      enabled: false,
      active: false,
      upcoming: false,
      bypass: false,
    };
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({}),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      throw new Error(data?.error || 'Failed to load maintenance status.');
    }

    return data as MaintenanceStatus;
  } catch (error) {
    console.warn('Maintenance status unavailable, allowing site access:', error);
    return {
      success: false,
      enabled: false,
      active: false,
      upcoming: false,
      bypass: false,
    };
  }
};
