
import { CardHeader, CardTitle } from "@/components/ui/card";

interface TableHeaderProps {
  title: string;
}

const TableHeader = ({ title }: TableHeaderProps) => {
  return (
    <CardHeader className="pb-2">
      <CardTitle className="text-xl md:text-2xl font-bold tracking-tight text-indigo-800 text-center">
        {title}
      </CardTitle>
    </CardHeader>
  );
};

export default TableHeader;
