import * as stylex from "@stylexjs/stylex";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  AtSign,
  Bookmark,
  ChevronDown,
  CircleDashed,
  Clock,
  Contact,
  EyeOff,
  FolderDown,
  Gauge,
  Globe,
  Hash,
  Heart,
  HeartOff,
  Image,
  Link,
  MessageCircle,
  Megaphone,
  Radar,
  Search,
  SearchX,
  Send,
  Shield,
  Smartphone,
  Sparkles,
  Tag,
  UserCheck,
  UserRound,
  UserX,
  Users,
  type LucideIcon
} from "lucide-react";
import { color, shape, space } from "@/styles/tokens.stylex";

const GLYPHS = {
  overview: Gauge,
  connections: Users,
  requests: Send,
  likes: Heart,
  stories: CircleDashed,
  security: Shield,
  tracking: Radar,
  messages: MessageCircle,
  content: Image,
  person: UserRound,

  followBack: UserCheck,
  noFollowBack: UserX,
  neverLiked: HeartOff,
  waiting: Clock,
  hashtag: Hash,
  handle: AtSign,
  saved: Bookmark,
  advertiser: Megaphone,
  contact: Contact,
  category: Tag,
  address: Globe,
  device: Smartphone,
  link: Link,
  suggested: Sparkles,

  open: ArrowUpRight,
  folder: FolderDown,
  expand: ChevronDown,
  search: Search,
  noResult: SearchX,
  absent: EyeOff,
  window: Clock,
  sortUp: ArrowUp,
  sortDown: ArrowDown
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof GLYPHS;

type Size = "small" | "medium" | "large";
type Tone = "primary" | "muted" | "subtle" | "brand" | "signal" | "positive" | "inherit";

const SIZES: Record<Size, string> = {
  small: space.s3,
  medium: space.s4,
  large: space.s6
};

const styles = stylex.create({
  base: { flexShrink: 0, display: "inline-flex" },
  primary: { color: color.fg },
  muted: { color: color.fgMuted },
  subtle: { color: color.fgSubtle },
  brand: { color: color.brand },
  signal: { color: color.signal },
  positive: { color: color.positive },
  inherit: { color: "inherit" }
});

export function Icon({
  name,
  size = "medium",
  tone = "subtle"
}: {
  name: IconName;
  size?: Size;
  tone?: Tone;
}) {
  const Glyph = GLYPHS[name];
  return (
    <span {...stylex.props(styles.base, styles[tone])}>
      <Glyph size={SIZES[size]} strokeWidth={1.75} aria-hidden />
    </span>
  );
}

const markStyles = stylex.create({
  root: {
    display: "grid",
    placeItems: "center",
    width: space.s8,
    height: space.s8,
    borderRadius: shape.radiusM,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    backgroundColor: color.surfaceSunken
  },
  brand: { backgroundColor: color.brandWash },
  signal: { backgroundColor: color.signalWash },
  positive: { backgroundColor: color.positiveWash }
});

export function IconMark({ name, tone = "subtle" }: { name: IconName; tone?: Tone }) {
  return (
    <span
      {...stylex.props(
        markStyles.root,
        tone === "brand" && markStyles.brand,
        tone === "signal" && markStyles.signal,
        tone === "positive" && markStyles.positive
      )}
    >
      <Icon name={name} tone={tone} />
    </span>
  );
}
