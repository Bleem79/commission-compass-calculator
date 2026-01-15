import { useState } from "react";
import { Calculator, X, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingCalculatorProps {
  className?: string;
}

export const FloatingCalculator = ({ className }: FloatingCalculatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes(".")) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const backspace = () => {
    if (display.length === 1 || (display.length === 2 && display.startsWith("-"))) {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      let result: number;

      switch (operation) {
        case "+":
          result = currentValue + inputValue;
          break;
        case "-":
          result = currentValue - inputValue;
          break;
        case "×":
          result = currentValue * inputValue;
          break;
        case "÷":
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
        case "%":
          result = currentValue % inputValue;
          break;
        default:
          result = inputValue;
      }

      setDisplay(String(result));
      setPreviousValue(result);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = () => {
    if (!operation || previousValue === null) return;

    const inputValue = parseFloat(display);
    let result: number;

    switch (operation) {
      case "+":
        result = previousValue + inputValue;
        break;
      case "-":
        result = previousValue - inputValue;
        break;
      case "×":
        result = previousValue * inputValue;
        break;
      case "÷":
        result = inputValue !== 0 ? previousValue / inputValue : 0;
        break;
      case "%":
        result = previousValue % inputValue;
        break;
      default:
        result = inputValue;
    }

    setDisplay(String(result));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(-value));
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {isOpen ? (
        <div className="bg-zinc-900 rounded-3xl p-4 shadow-2xl border border-zinc-800 animate-in slide-in-from-bottom-2 duration-300 min-w-[280px]">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center">
                <Calculator className="h-4 w-4 text-zinc-900" />
              </div>
              <span className="text-white font-semibold text-sm">Calculator</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Display */}
          <div className="bg-zinc-800/50 rounded-2xl p-4 mb-4">
            <div className="text-zinc-500 text-xs h-5 text-right font-medium">
              {previousValue !== null && operation && `${previousValue} ${operation}`}
            </div>
            <div className="text-white text-3xl font-bold text-right truncate">
              {display}
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {/* Row 1 */}
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-lg border-0"
              onClick={clear}
            >
              C
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-lg border-0"
              onClick={toggleSign}
            >
              ±
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold text-lg border-0"
              onClick={() => performOperation("%")}
            >
              %
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-xl border-0"
              onClick={() => performOperation("÷")}
            >
              ÷
            </Button>

            {/* Row 2 */}
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={() => inputDigit("7")}
            >
              7
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={() => inputDigit("8")}
            >
              8
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={() => inputDigit("9")}
            >
              9
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-xl border-0"
              onClick={() => performOperation("×")}
            >
              ×
            </Button>

            {/* Row 3 */}
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={() => inputDigit("4")}
            >
              4
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={() => inputDigit("5")}
            >
              5
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={() => inputDigit("6")}
            >
              6
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-xl border-0"
              onClick={() => performOperation("-")}
            >
              −
            </Button>

            {/* Row 4 */}
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={() => inputDigit("1")}
            >
              1
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={() => inputDigit("2")}
            >
              2
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={() => inputDigit("3")}
            >
              3
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-xl border-0"
              onClick={() => performOperation("+")}
            >
              +
            </Button>

            {/* Row 5 */}
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={backspace}
            >
              <Delete className="h-5 w-5" />
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={() => inputDigit("0")}
            >
              0
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg border-0"
              onClick={inputDecimal}
            >
              .
            </Button>
            <Button 
              className="h-12 w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-900 font-bold text-xl border-0"
              onClick={calculate}
            >
              =
            </Button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-amber-400 hover:bg-amber-300 text-zinc-900 border-0"
        >
          <Calculator className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};
