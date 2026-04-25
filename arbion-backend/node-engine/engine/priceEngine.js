// engine/priceEngine.js

let price = 30000;        // starting price
let volatility = 5;       // controls movement strength

function getNextPrice() {
  const random = (Math.random() - 0.5) * 2; // -1 to 1

  const change = price * (random * volatility / 1000);
  price += change;

  return price.toFixed(2);
}

function startPriceStream(socket) {
  let running = true;

  function emitPrice() {
    if (!running) return;

    const newPrice = getNextPrice();

    socket.emit('price', {
      symbol: 'BTCUSD',
      price: newPrice
    });

    const delay = Math.random() * 400 + 100; // 100–500ms
    setTimeout(emitPrice, delay);
  }

  emitPrice();

  // return stop function
  return () => {
    running = false;
  };
}

module.exports = {
  startPriceStream
};