// One file per icon: Metro doesn't tree-shake, so importing from the package root bundles all ~1,900 icons.
import Bell from 'lucide-react-native/icons/bell';
import Book from 'lucide-react-native/icons/book';
import Calendar from 'lucide-react-native/icons/calendar';
import ChartColumn from 'lucide-react-native/icons/chart-column';
import Check from 'lucide-react-native/icons/check';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleQuestionMark from 'lucide-react-native/icons/circle-question-mark';
import Clock from 'lucide-react-native/icons/clock';
import Code from 'lucide-react-native/icons/code';
import Contrast from 'lucide-react-native/icons/contrast';
import Download from 'lucide-react-native/icons/download';
import Droplet from 'lucide-react-native/icons/droplet';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Flame from 'lucide-react-native/icons/flame';
import Flower2 from 'lucide-react-native/icons/flower-2';
import Footprints from 'lucide-react-native/icons/footprints';
import Heart from 'lucide-react-native/icons/heart';
import House from 'lucide-react-native/icons/house';
import Info from 'lucide-react-native/icons/info';
import ListChecks from 'lucide-react-native/icons/list-checks';
import Lock from 'lucide-react-native/icons/lock';
import LogOut from 'lucide-react-native/icons/log-out';
import Mail from 'lucide-react-native/icons/mail';
import Minus from 'lucide-react-native/icons/minus';
import Moon from 'lucide-react-native/icons/moon';
import Palette from 'lucide-react-native/icons/palette';
import Pencil from 'lucide-react-native/icons/pencil';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import Shield from 'lucide-react-native/icons/shield';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Star from 'lucide-react-native/icons/star';
import Target from 'lucide-react-native/icons/target';
import Trash from 'lucide-react-native/icons/trash';
import TrendingDown from 'lucide-react-native/icons/trending-down';
import TrendingUp from 'lucide-react-native/icons/trending-up';
import Trophy from 'lucide-react-native/icons/trophy';
import Upload from 'lucide-react-native/icons/upload';
import User from 'lucide-react-native/icons/user';
import Volume2 from 'lucide-react-native/icons/volume-2';
import X from 'lucide-react-native/icons/x';

/** Every lucide icon has this type (taken from one, so the package root is never imported). */
type LucideIcon = typeof Bell;

/** The icons the app uses, by name. */
export const ICONS = {
  alert: CircleAlert,
  bell: Bell,
  book: Book,
  calendar: Calendar,
  chart: ChartColumn,
  check: Check,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  clock: Clock,
  close: X,
  code: Code,
  contrast: Contrast,
  download: Download,
  droplet: Droplet,
  dumbbell: Dumbbell,
  flame: Flame,
  flower: Flower2,
  footprints: Footprints,
  heart: Heart,
  help: CircleQuestionMark,
  house: House,
  info: Info,
  list: ListChecks,
  lock: Lock,
  'log-out': LogOut,
  mail: Mail,
  minus: Minus,
  moon: Moon,
  palette: Palette,
  pencil: Pencil,
  plus: Plus,
  search: Search,
  shield: Shield,
  sparkles: Sparkles,
  star: Star,
  target: Target,
  trash: Trash,
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  trophy: Trophy,
  upload: Upload,
  user: User,
  volume: Volume2,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export function isIconName(name: string): name is IconName {
  return Object.hasOwn(ICONS, name);
}
