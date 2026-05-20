import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MemberCardProps {
  member: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    role: string;
    avatar: string | null;
  };
  onClick?: () => void;
}

const roleBadgeConfig: Record<string, { label: string; className: string }> = {
  ADMIN: {
    label: "Admin",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  LEADER: {
    label: "Leader",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  MEMBER: {
    label: "Membre",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MemberCard({ member, onClick }: MemberCardProps) {
  const badge = roleBadgeConfig[member.role] || roleBadgeConfig.MEMBER;

  return (
    <Card
      className="hover:border-primary/50 transition-colors cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar>
            {member.avatar && <AvatarImage src={member.avatar} alt={member.name} />}
            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold truncate">{member.name}</h3>
              <Badge variant="outline" className={badge.className}>
                {badge.label}
              </Badge>
            </div>
            {member.email && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {member.email}
              </p>
            )}
            {member.phone && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {member.phone}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
