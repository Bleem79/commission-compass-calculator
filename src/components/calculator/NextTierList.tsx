
interface NextTierListProps {
  tiers: { percentage: number; amountNeeded: number }[];
}

export const NextTierList = ({ tiers }: NextTierListProps) => {
  if (tiers.length === 0) return null;

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-4 border border-indigo-100 mt-4">
      <div className="font-semibold text-indigo-700 mb-2">Next Tiers:</div>
      <div className="space-y-2">
        {tiers.map((tier, index) => (
          <div 
            key={index} 
            className="flex items-center space-x-2 text-indigo-600 bg-indigo-50 rounded-md p-2"
          >
            <ArrowRight className="h-4 w-4" />
            <span>{tier.percentage}% <span className="text-gray-600 ml-2">(Need {tier.amountNeeded.toFixed(2)})</span></span>
          </div>
        ))}
      </div>
    </div>
  );
};

const ArrowRight = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className || "lucide lucide-arrow-right"}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);
