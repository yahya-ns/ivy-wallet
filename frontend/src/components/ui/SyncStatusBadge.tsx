import React from 'react';
import { useNetworkStatus } from '@/lib/useNetworkStatus';
import { RefreshCw, Wifi, WifiOff, CheckCircle2 } from 'lucide-react';
import { clsx } from 'clsx';

interface SyncStatusBadgeProps {
  showLabel?: boolean;
  className?: string;
}

export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
  showLabel = true,
  className = '',
}) => {
  const { isOnline, isSyncing, pendingCount, syncNow } = useNetworkStatus();

  return (
    <button
      onClick={() => isOnline && !isSyncing && syncNow()}
      disabled={!isOnline || isSyncing}
      title={
        isSyncing
          ? 'Synchronizing data with server...'
          : !isOnline
          ? `Offline Mode: ${pendingCount} local changes pending sync`
          : 'Online & Synced (Click to sync now)'
      }
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all select-none',
        isSyncing && 'bg-[#5C3DF5]/15 text-[#5C3DF5] border border-[#5C3DF5]/30',
        !isOnline && 'bg-amber-500/15 text-amber-400 border border-amber-500/30 cursor-default',
        isOnline && !isSyncing && 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 active:scale-95',
        className
      )}
    >
      {isSyncing ? (
        <>
          <RefreshCw size={12} className="animate-spin text-[#5C3DF5]" />
          {showLabel && <span>Syncing...</span>}
        </>
      ) : !isOnline ? (
        <>
          <WifiOff size={12} className="text-amber-400" />
          {showLabel && (
            <span>
              Offline
              {pendingCount > 0 ? ` (${pendingCount})` : ''}
            </span>
          )}
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {showLabel && <span>Online</span>}
        </>
      )}
    </button>
  );
};
