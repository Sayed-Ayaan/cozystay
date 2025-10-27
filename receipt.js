$(document).ready(function () {
  const prices = {
    deluxeRooms: 4000,
    suiteRooms: 7000,
    standardRooms: 2500
  };

  function getQueryParams() {
    const params = {};
    const queryString = window.location.search.substring(1);
    const pairs = queryString.split("&");
    for (const pair of pairs) {
      if (pair) {
        const [key, value] = pair.split("=");
        params[decodeURIComponent(key)] = decodeURIComponent(value || "");
      }
    }
    return params;
  }

  const params = getQueryParams();

  const name = params.name || "Valued Guest";
  const checkin = params.checkin ? new Date(params.checkin) : null;
  const checkout = params.checkout ? new Date(params.checkout) : null;

  // ✅ Format date as DD/MM/YYYY
  function formatDate(date) {
    if (!date || isNaN(date)) return "-";
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  // Calculate number of nights
  let nights = 1;
  if (checkin && checkout && checkout > checkin) {
    const diffTime = checkout - checkin;
    nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Insert formatted values into receipt
  $("#guestName").text(name);
  $("#checkinDate").text(formatDate(checkin));
  $("#checkoutDate").text(formatDate(checkout));
  $("#numNights").text(nights);

  const deluxeQty = parseInt(params.deluxeRooms) || 0;
  const suiteQty = parseInt(params.suiteRooms) || 0;
  const standardQty = parseInt(params.standardRooms) || 0;

  const receiptBody = $("#receiptBody");
  let subtotal = 0;

  function addRow(roomName, qty, price) {
    if (qty > 0) {
      const subtotalRoom = qty * price * nights;
      subtotal += subtotalRoom;
      receiptBody.append(`
        <tr>
          <td>${roomName}</td>
          <td>${qty}</td>
          <td>₹${price.toFixed(2)}</td>
          <td>${nights}</td>
          <td>₹${subtotalRoom.toFixed(2)}</td>
        </tr>
      `);
    }
  }

  addRow("Deluxe Rooms", deluxeQty, prices.deluxeRooms);
  addRow("Executive Suites", suiteQty, prices.suiteRooms);
  addRow("Standard Rooms", standardQty, prices.standardRooms);

  const gst = subtotal * 0.18;
  const total = subtotal + gst;

  $("#subtotalAmount").text(`₹${subtotal.toFixed(2)}`);
  $("#gstAmount").text(`₹${gst.toFixed(2)}`);
  $("#totalAmount").text(`₹${total.toFixed(2)}`);
});
