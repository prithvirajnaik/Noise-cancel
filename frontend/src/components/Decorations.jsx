// Purely decorative background shapes (blobs, dot grids, leaves) behind the page content.
function DotGrid({ className, color }) {
  return (
    <div
      className={`absolute ${className}`}
      style={{ backgroundImage: `radial-gradient(${color} 3px, transparent 3.5px)`, backgroundSize: '18px 18px' }}
    />
  );
}

export default function Decorations() {
  return (
    <div aria-hidden="true" className="decor pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-28 top-28 h-64 w-48 rounded-full bg-[#fde7b0]" />
      <DotGrid className="left-2 top-4 hidden h-16 w-14 sm:block" color="#fbd8a0" />
      <div className="absolute left-[58%] -top-16 h-28 w-56 rounded-[50%] bg-[#dcebfb]" />
      <div className="absolute -right-20 top-[62%] h-56 w-40 rounded-full bg-[#ece2fb]" />
      <DotGrid className="bottom-4 right-6 h-14 w-16" color="#f6c1c1" />
      <DotGrid className="left-2 top-[48%] h-12 w-10" color="#c9dcf5" />

      <svg className="absolute right-0 top-[28%] w-20" viewBox="0 0 80 40" fill="none">
        <path d="M2 30c10-18 18-18 26 0s16 18 24 0 16-18 26 0" stroke="#c4b2f3" strokeWidth="4" strokeLinecap="round" />
      </svg>

      <svg className="absolute -bottom-2 -left-2 w-28" viewBox="0 0 120 160" fill="none">
        <path d="M20 160C10 110 20 60 70 10c10 50 0 100-50 150Z" fill="#9fd6a2" />
        <path d="M20 160C30 120 45 80 70 10" stroke="#5aa564" strokeWidth="3" />
        <path d="M0 160c0-40 15-70 45-90-5 40-20 70-45 90Z" fill="#7cc483" />
      </svg>
    </div>
  );
}
