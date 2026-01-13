import { useState } from "react";
import { Calculator, X, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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

  const buttonClass = "h-10 w-10 text-lg font-medium rounded-lg transition-all";
  const numberClass = `${buttonClass} bg-muted hover:bg-muted/80 text-foreground`;
  const operatorClass = `${buttonClass} bg-primary/20 hover:bg-primary/30 text-primary`;
  const equalsClass = `${buttonClass} bg-primary hover:bg-primary/90 text-primary-foreground`;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {isOpen ? (
        <Card className="p-3 shadow-xl bg-background/95 backdrop-blur-sm border-2 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <Calculator className="h-4 w-4" />
              Calculator
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Display */}
          <div className="bg-muted rounded-lg p-3 mb-3 min-w-[200px]">
            <div className="text-xs text-muted-foreground h-4">
              {previousValue !== null && operation && `${previousValue} ${operation}`}
            </div>
            <div className="text-2xl font-bold text-right truncate">
              {display}
            </div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            <Button variant="outline" className={`${buttonClass} bg-destructive/20 hover:bg-destructive/30 text-destructive`} onClick={clear}>
              C
            </Button>
            <Button variant="outline" className={operatorClass} onClick={toggleSign}>
              ±
            </Button>
            <Button variant="outline" className={operatorClass} onClick={() => performOperation("%")}>
              %
            </Button>
            <Button variant="outline" className={operatorClass} onClick={() => performOperation("÷")}>
              ÷
            </Button>

            <Button variant="outline" className={numberClass} onClick={() => inputDigit("7")}>7</Button>
            <Button variant="outline" className={numberClass} onClick={() => inputDigit("8")}>8</Button>
            <Button variant="outline" className={numberClass} onClick={() => inputDigit("9")}>9</Button>
            <Button variant="outline" className={operatorClass} onClick={() => performOperation("×")}>
              ×
            </Button>

            <Button variant="outline" className={numberClass} onClick={() => inputDigit("4")}>4</Button>
            <Button variant="outline" className={numberClass} onClick={() => inputDigit("5")}>5</Button>
            <Button variant="outline" className={numberClass} onClick={() => inputDigit("6")}>6</Button>
            <Button variant="outline" className={operatorClass} onClick={() => performOperation("-")}>
              −
            </Button>

            <Button variant="outline" className={numberClass} onClick={() => inputDigit("1")}>1</Button>
            <Button variant="outline" className={numberClass} onClick={() => inputDigit("2")}>2</Button>
            <Button variant="outline" className={numberClass} onClick={() => inputDigit("3")}>3</Button>
            <Button variant="outline" className={operatorClass} onClick={() => performOperation("+")}>
              +
            </Button>

            <Button variant="outline" className={numberClass} onClick={backspace}>
              <Delete className="h-4 w-4" />
            </Button>
            <Button variant="outline" className={numberClass} onClick={() => inputDigit("0")}>0</Button>
            <Button variant="outline" className={numberClass} onClick={inputDecimal}>.</Button>
            <Button variant="outline" className={equalsClass} onClick={calculate}>
              =
            </Button>
          </div>
        </Card>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        >
          <Calculator className="h-6 w-6" />
        </Button>
      )}
    </div>
  );
};
