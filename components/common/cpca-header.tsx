import Image from "next/image";

interface CpcaHeaderProps {
  title: string;
  subtitle: string;
}

const CpcaHeader = ({ title, subtitle }: CpcaHeaderProps) => {
  return (
    <header className="flex items-center gap-4 mb-4">
      <Image src="/cpca-logo.png" alt="CPCA Logo" width={80} height={40} />
      <div className="border-l-2 border-muted-foreground pl-4">
        <h4 className="font-semibold text-lg">{title}</h4>
        <p className="text-sm">{subtitle}</p>
      </div>
    </header>
  );
};
export default CpcaHeader;
