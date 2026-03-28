import type { AssetClass, Direction } from "@/types";

// === Local Types ===

export interface OrderRequest {
  symbol: string;
  assetClass: AssetClass;
  direction: Direction;
  orderType: "market" | "limit" | "stop";
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  timeInForce: "day" | "gtc" | "ioc" | "fok";
}

export interface OrderResult {
  orderId: string;
  symbol: string;
  direction: Direction;
  orderType: "market" | "limit" | "stop";
  quantity: number;
  filledQuantity: number;
  filledPrice: number;
  status: "filled" | "partial" | "pending" | "rejected" | "cancelled";
  timestamp: string;
}

export interface Position {
  symbol: string;
  assetClass: AssetClass;
  direction: Direction;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  openedAt: string;
}

// === Provider Interface ===

export interface ExecutionProvider {
  submitOrder(order: OrderRequest): Promise<OrderResult>;
  getPositions(): Promise<Position[]>;
  cancelOrder(orderId: string): Promise<boolean>;
}

// === Implementations ===

class MockExecutionProvider implements ExecutionProvider {
  async submitOrder(order: OrderRequest): Promise<OrderResult> {
    // Paper trading simulation — immediately fill at a realistic price
    const mockPrice = order.limitPrice || order.stopPrice || 100;
    return {
      orderId: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      symbol: order.symbol,
      direction: order.direction,
      orderType: order.orderType,
      quantity: order.quantity,
      filledQuantity: order.quantity,
      filledPrice: mockPrice,
      status: "filled",
      timestamp: new Date().toISOString(),
    };
  }

  async getPositions(): Promise<Position[]> {
    return [];
  }

  async cancelOrder(_orderId: string): Promise<boolean> {
    return true;
  }
}

class AlpacaExecutionProvider implements ExecutionProvider {
  private apiKey: string;
  private secretKey: string;

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  async submitOrder(_order: OrderRequest): Promise<OrderResult> {
    // TODO: Implement Alpaca trading API
    // POST https://paper-api.alpaca.markets/v2/orders
    // Headers: APCA-API-KEY-ID, APCA-API-SECRET-KEY
    throw new Error("Alpaca execution provider not yet implemented. Set up at https://alpaca.markets");
  }

  async getPositions(): Promise<Position[]> {
    // TODO: Implement Alpaca positions API
    // GET https://paper-api.alpaca.markets/v2/positions
    throw new Error("Alpaca execution provider not yet implemented. Set up at https://alpaca.markets");
  }

  async cancelOrder(_orderId: string): Promise<boolean> {
    // TODO: Implement Alpaca cancel order API
    // DELETE https://paper-api.alpaca.markets/v2/orders/{orderId}
    throw new Error("Alpaca execution provider not yet implemented. Set up at https://alpaca.markets");
  }
}

export function getExecutionProvider(): ExecutionProvider {
  const apiKey = process.env.ALPACA_API_KEY;
  const secretKey = process.env.ALPACA_SECRET_KEY;
  if (apiKey && secretKey) return new AlpacaExecutionProvider(apiKey, secretKey);
  return new MockExecutionProvider();
}
