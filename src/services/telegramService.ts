export const telegramService = {
  async notifyNewOrder(orderData: {
    customerName: string;
    phone: string;
    address: string;
    itemCount: number;
    totalAmount: number;
    paymentMethod: string;
    items: { name: string; quantity: number }[];
  }) {
    try {
      const response = await fetch('/api/order-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to send Telegram notification via backend');
      }

      return await response.json();
    } catch (error) {
      console.error('Telegram notification error:', error);
      // We don't throw here to avoid failing the order placement if notification fails
    }
  }
};
