import { TONES } from './tones';

const SIZES = {
  md: { box: 'h-11 w-11 rounded-xl', icon: 20 },
  lg: { box: 'h-14 w-14 rounded-2xl border-[1.5px] border-primary/40', icon: 26 },
  round: { box: 'h-12 w-12 rounded-full', icon: 22 },
};

export default function IconBadge({ icon: Icon, tone = 'primary', size = 'md' }) {
  const s = SIZES[size];
  return (
    <span className={`grid shrink-0 place-items-center ${s.box} ${TONES[tone].badge}`}>
      <Icon size={s.icon} />
    </span>
  );
}
