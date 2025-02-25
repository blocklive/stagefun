type TokenCardProps = {
  name: string;
  ticker: string;
  imageSrc?: string;
};

export default function TokenCard({ name, ticker, imageSrc }: TokenCardProps) {
  return (
    <div className="mb-6">
      <div className="text-xl mb-1">{name}</div>
      <div className="text-xl mb-1">{name}</div>
      <div className="text-3xl font-bold">{ticker}</div>
    </div>
  );
}
