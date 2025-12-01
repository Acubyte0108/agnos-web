import { Badge } from "@/components/ui/badge";
import { ActivePatientStatus, PatientStatus } from "@/hooks/use-web-socket";

type StatusStyleConfig = {
  bg: string;
  text: string;
  label: string;
  dot?: string;
  animation?: string;
};

const STATUS_STYLES: Record<PatientStatus, StatusStyleConfig> = {
  updating: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    dot: "bg-blue-500",
    label: "✏️ Updating",
    animation: "animate-pulse",
  },
  online: {
    bg: "bg-green-100",
    text: "text-green-800",
    dot: "bg-green-500",
    label: "🟢 Online",
    animation: "",
  },
  idle: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    dot: "bg-yellow-500",
    label: "💤 Idle",
    animation: "",
  },
  disconnected: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
    label: "⚫ Offline",
    animation: "",
  },
};

export function getStatusStyle(status: PatientStatus): StatusStyleConfig {
  return STATUS_STYLES[status] || STATUS_STYLES.disconnected;
}

type StatusBadgeProps = {
  status: ActivePatientStatus | PatientStatus;
  className?: string;
  showDot?: boolean;
}

function StatusBadge({ status, className = "", showDot = false }: StatusBadgeProps) {
  const style = getStatusStyle(status as PatientStatus);

  if (showDot) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span
          className={`inline-block w-3 h-3 rounded-full ${style.dot} ${style.animation}`}
          title={style.label}
        />
        <Badge
          variant="outline"
          className={`${style.bg} ${style.text} border-0 text-xs`}
        >
          {style.label}
        </Badge>
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`${style.bg} ${style.text} border-0 text-xs ${className}`}
    >
      {style.label}
    </Badge>
  );
}

interface StatusDotProps {
  status: PatientStatus;
  className?: string;
}

function StatusDot({ status, className = "" }: StatusDotProps) {
  const style = getStatusStyle(status);

  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${style.dot} ${style.animation} ${className}`}
      title={style.label}
    />
  );
}

export { StatusBadge, StatusDot }