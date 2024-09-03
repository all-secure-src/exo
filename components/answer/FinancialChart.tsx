import React, { useEffect, useRef, memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const styles = {
  container: {
    height: "400px",
    width: "100%",
    maxHeight: "400px",
    minHeight: "400px",
    "@media (max-width: 768px)": {
      height: "150px",
      maxHeight: "150px",
      minHeight: "150px",
    },
  },
};

type TransactionType = 'buy' | 'sell';

function FinancialChart({ ticker }: { ticker: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('buy');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('USD');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = `
      {
        "autosize": true,
        "symbol": "${ticker}",
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "light",
        "style": "2",
        "locale": "en",
        "enable_publishing": false,
        "allow_symbol_change": true,
        "calendar": false,
        "support_host": "https://www.tradingview.com",
        "container_id": "${container.current?.id}"
      }
    `;
    if (container.current) {
      container.current.appendChild(script);
    }
    return () => {
      if (container.current) {
        container.current.innerHTML = "";
      }
    };
  }, [ticker]);

  const handleTransaction = useCallback((type: TransactionType) => {
    setTransactionType(type);
    setShowModal(true);
    setAmount('');
    setUnit(type === 'buy' ? 'USD' : 'Stock');
  }, []);

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
  }, []);

  const handleUnitChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setUnit(e.target.value);
  }, []);

  const handleNext = useCallback(() => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setShowSuccess(true);
    }, 5000);
  }, []);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setShowSuccess(false);
  }, []);

  return (
    <div className="relative">
      <div className="my-5 tradingview-widget-container" ref={container} style={styles.container}>
        <div className="tradingview-widget-copyright"></div>
      </div>
      <div className="mt-4 flex justify-center space-x-4">
        <Button onClick={() => handleTransaction('buy')} style={{background: "green"}}>Buy</Button>
        <Button onClick={() => handleTransaction('sell')} style={{background: "red"}}>Sell</Button>
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-md relative">
            <Button 
              onClick={handleClose}
              className="absolute top-2 right-2 p-1"
              variant="ghost"
            >
              <X size={24} />
            </Button>
            <h2 className="text-2xl font-bold mb-4">{transactionType === 'buy' ? 'Buy' : 'Sell'} {ticker}</h2>
            {!showSuccess ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount ({unit})
                  </label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder={`Enter amount in ${unit}`}
                  />
                </div>
                {transactionType === 'buy' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Unit
                    </label>
                    <select
                      value={unit}
                      onChange={handleUnitChange}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="USD">USD</option>
                      <option value="Stock">Stock Units</option>
                    </select>
                  </div>
                )}
                <Button
                  onClick={handleNext}
                  disabled={isLoading || !amount}
                  className="w-full"
                >
                  {isLoading ? 'Processing...' : 'Next'}
                </Button>
              </>
            ) : (
              <div className="text-center">
                <p className="text-xl font-bold mb-4">Congratulations!</p>
                <p>Your {transactionType} order for {amount} {unit} of {ticker} has been placed successfully.</p>
                <Button onClick={handleClose} className="mt-4">Close</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(FinancialChart);