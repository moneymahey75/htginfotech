import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { getMaintenanceStatus, type MaintenanceStatus } from '../../lib/maintenance';

interface MaintenanceGateProps {
  children: React.ReactNode;
}

const formatDateTime = (value?: string) => {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const getDismissKey = (status: MaintenanceStatus | null) =>
  `maintenance-notice-dismissed:${status?.startAt || 'unscheduled'}`;

const MaintenanceGate: React.FC<MaintenanceGateProps> = ({ children }) => {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadStatus = async () => {
      const nextStatus = await getMaintenanceStatus();

      if (!isActive) {
        return;
      }

      setStatus(nextStatus);

      try {
        setDismissed(sessionStorage.getItem(getDismissKey(nextStatus)) === 'true');
      } catch {
        setDismissed(false);
      }
    };

    void loadStatus();
    const intervalId = window.setInterval(loadStatus, 60 * 1000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const maintenanceMessage = useMemo(() => {
    if (!status?.startAt) {
      return 'Website maintenance is scheduled soon.';
    }

    return `Website maintenance is scheduled on ${formatDateTime(status.startAt)}.`;
  }, [status?.startAt]);

  const handleDismiss = () => {
    setDismissed(true);

    try {
      sessionStorage.setItem(getDismissKey(status), 'true');
    } catch {
      // Dismissal is a convenience only.
    }
  };

  if (status?.active && !status.bypass) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-300">
            <Clock className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold sm:text-4xl">Website Under Maintenance</h1>
          <p className="mt-4 text-base leading-7 text-slate-300 sm:text-lg">
            Website is currently under maintenance. Please try again later.
          </p>
          {status.endAt ? (
            <p className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              Expected finish: {formatDateTime(status.endAt)}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <>
      {status?.upcoming && !status.bypass && !dismissed ? (
        <div className="fixed inset-x-0 top-0 z-[70] border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
          <div className="mx-auto flex max-w-7xl items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <p className="min-w-0 flex-1 text-sm font-medium">{maintenanceMessage}</p>
            <button
              type="button"
              onClick={handleDismiss}
              className="rounded-lg p-1 text-amber-700 transition hover:bg-amber-100 hover:text-amber-900"
              aria-label="Dismiss maintenance notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
      {children}
    </>
  );
};

export default MaintenanceGate;
