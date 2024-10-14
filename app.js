// Get the food dropdown and form elements
const foodSelect = document.getElementById('foodSelect');
const quantityInput = document.getElementById('quantity');
const foodForm = document.getElementById('foodForm');
const cartItems = document.getElementById('cartItems');
const foodItems = document.getElementById('foodItems');
const totalDisplay = document.getElementById('totalPriceDisplay');
const addToCartButton = document.getElementById('addToCartButton');
const syncButton = document.getElementById('syncButton'); // Sync button
const completedTotalDisplay = document.getElementById('completedTotalPriceDisplay'); // Completed orders total display
const cartTotalPriceDisplay = document.getElementById('cartTotalPriceDisplay');
const checkOrderStatusButton = document.getElementById('checkOrderStatusButton');

// Initialize total price and cart
let totalPrice = 0;
let cart = [];
let cartTotalPrice = 0;
let completedTotalPrice = 0;

// Upstash Redis credentials (use environment variables in production)
    const upstashURL = window.env.UPSTASH_REST_URL;
    const token = window.env.UPSTASH_REST_TOKEN;
/**
 * Function to save the cart to Redis
 */
async function saveCartToRedis(cart) {
    try {
        const response = await fetch(`${upstashURL}/set/cart`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: JSON.stringify(cart) })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to save cart to Redis:', errorData);
        } else {
            console.log('Cart successfully saved to Redis.');
        }
    } catch (error) {
        console.error('Error saving cart to Redis:', error);
    }
}

/**
 * Function to load the cart from Redis
 */
async function loadCartFromRedis() {
    try {
        const response = await fetch(`${upstashURL}/get/cart`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.result) {
                try {
                    cart = JSON.parse(data.result);
                    if (!Array.isArray(cart)) {
                        cart = []; // Initialize as an empty array if not an array
                    }

                    // Render each cart item
                    cart.forEach(item => {
                        const cartListItem = document.createElement('li');
                        cartListItem.textContent = `${item.foodName} - Quantity: ${item.quantity}, Price: ${item.itemTotalPrice}, Note: ${item.cartNote || '-'}`;
                        cartItems.appendChild(cartListItem);
                    });
                } catch (error) {
                    console.error('Error parsing cart data:', error);
                    cart = []; // Reset cart in case of parsing error
                }
            } else {
                console.log('No cart found in Redis.');
            }
        } else {
            const errorData = await response.json();
            console.error('Failed to load cart from Redis:', errorData);
        }
    } catch (error) {
        console.error('Error loading cart from Redis:', error);
    }
}

function generateSequentialTransactionNumber(purchases) {
    if (purchases.length === 0) {
        return '001'; // Start with '001' if there are no purchases yet
    }

    // Get the last purchase
    const lastPurchase = purchases[purchases.length - 1];

    // Ensure the last transaction number exists and is valid
    let lastTransactionNumber = lastPurchase.transactionNumber;

    // If the transaction number is missing or invalid, start from '001'
    if (!lastTransactionNumber || isNaN(parseInt(lastTransactionNumber, 10))) {
        return '001';
    }

    // Parse the transaction number as an integer
    lastTransactionNumber = parseInt(lastTransactionNumber, 10);

    // Increment the transaction number
    let newTransactionNumber = lastTransactionNumber + 1;

    // Convert to a string and pad with leading zeros (e.g., '001', '002', etc.)
    return newTransactionNumber.toString().padStart(3, '0');
}

/**
 * Function to save purchases to Redis
 */
async function savePurchasesToRedis(purchases) {
    try {
        const response = await fetch(`${upstashURL}/set/purchases`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ value: JSON.stringify(purchases) }) // Ensure purchases are stringified
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to save purchases to Redis:', errorData);
        } else {
            console.log('Purchases successfully saved to Redis.');
        }
    } catch (error) {
        console.error('Error saving purchases to Redis:', error);
    }
}


/**
 * Function to save a single purchase to localStorage and Redis
 */
function savePurchase(foodName, quantity, itemTotalPrice, time, cartNote, status) {
    
    let purchases = JSON.parse(localStorage.getItem('purchases')) || [];
    
    const transactionNumber = generateSequentialTransactionNumber(purchases);
    
    const purchase = {
        transactionNumber,
        foodName,
        quantity,
        itemTotalPrice,
        time,
        cartNote,
        status: 'pending'
    };

    purchases.push(purchase);
    localStorage.setItem('purchases', JSON.stringify(purchases));

    totalPrice += parseFloat(itemTotalPrice);
    updateTotalPrice();

    // Save purchases to Redis
    savePurchasesToRedis(purchases);
    renderPurchases(purchases);
}


const orderStatusDisplay = document.getElementById('orderStatusDisplay');

// Function to check the status of all purchases
// Function to check the status of all purchases
async function checkOrderStatus() {
    let purchases = JSON.parse(localStorage.getItem('purchases')) || [];

    // Get purchases from Redis as well
    try {
        const response = await fetch(`${upstashURL}/get/purchases`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.result) {
                const redisPurchases = JSON.parse(JSON.parse(data.result).value);
                purchases = [...purchases, ...redisPurchases];
            }
        }
    } catch (error) {
        console.error('Error fetching purchases from Redis:', error);
    }

    // Check if there are any purchases
    if (purchases.length === 0) {
        orderStatusDisplay.textContent = "No purchases found.";
        return;
    }

    // Check the status of each purchase
    let allCompleted = true;
    purchases.forEach(purchase => {
        if (purchase.status !== 'completed') {
            allCompleted = false;
        }
    });

    // Display the result
    if (allCompleted) {
        orderStatusDisplay.textContent = "All orders are completed!";
    } else {
        orderStatusDisplay.textContent = "Some orders are still pending.";
    }
}



/**
 * Function to load saved purchases from localStorage and Redis
 */
/**
 * Function to load saved purchases from localStorage and Redis
 */
/**
 * Function to load saved purchases from localStorage and Redis
 */
async function loadSavedPurchases() {
    // Load from localStorage first
    let localPurchases = JSON.parse(localStorage.getItem('purchases')) || [];

    // Now load from Redis
    let redisPurchases = [];
    try {
        const response = await fetch(`${upstashURL}/get/purchases`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();

            if (data.result) {
                try {
                    // Parse the data from Redis
                    const parsedData = JSON.parse(data.result);
                    redisPurchases = JSON.parse(parsedData.value);
                } catch (error) {
                    console.error('Error parsing purchases data from Redis:', error);
                }
            } else {
                console.log('No purchases found in Redis.');
            }
        } else {
            const errorData = await response.json();
            console.error('Failed to load purchases from Redis:', errorData);
        }
    } catch (error) {
        console.error('Error loading purchases from Redis:', error);
    }

    // Filter out any duplicates by comparing foodName, quantity, and time
    const mergedPurchases = [...localPurchases];

    redisPurchases.forEach(redisPurchase => {
        const isDuplicate = localPurchases.some(localPurchase => (
            localPurchase.foodName === redisPurchase.foodName &&
            localPurchase.quantity === redisPurchase.quantity &&
            localPurchase.time === redisPurchase.time
        ));

        if (!isDuplicate) {
            mergedPurchases.push(redisPurchase);
        }
    });

    // Save the merged purchases back to localStorage
    localStorage.setItem('purchases', JSON.stringify(mergedPurchases));

    // Render the purchases with the status dropdown
    renderPurchases(mergedPurchases);

    updateTotalPrice(mergedPurchases);  // Call the function here to update the total price
}

function updateTotalPrice() {
    if (totalDisplay) {
        totalDisplay.textContent = `Total: Rp ${totalPrice.toFixed(2)}`;
    } else {
        console.warn('Element with ID "totalPriceDisplay" not found.');
    }

    if (completedTotalDisplay) {
        completedTotalDisplay.textContent = `Completed Total: Rp ${completedTotalPrice.toFixed(2)}`;
    } else {
        console.warn('Element with ID "completedTotalPriceDisplay" not found.');
    }
}
/**
 * Sync Functionality: Sync data between localStorage and Redis
 */
async function syncData() {
    try {
        // Step 1: Fetch the latest cart and purchases from Redis
        const cartResponse = await fetch(`${upstashURL}/get/cart`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const purchasesResponse = await fetch(`${upstashURL}/get/purchases`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const cartData = await cartResponse.json();
        const purchasesData = await purchasesResponse.json();

        // Step 2: Parse the Redis cart and purchases data safely
        let redisCart = [];
        let redisPurchases = [];

        if (cartData.result) {
            try {
                const parsedCartData = JSON.parse(cartData.result);
                redisCart = JSON.parse(parsedCartData.value);
            } catch (error) {
                redisCart = [];
            }
        }

        if (purchasesData.result) {
            try {
                const parsedPurchasesData = JSON.parse(purchasesData.result);
                redisPurchases = JSON.parse(parsedPurchasesData.value);
            } catch (error) {
                redisPurchases = [];
            }
        }

        // Step 3: Merge Redis data with localStorage data
        let cart = redisCart;
        let purchases = redisPurchases;

        // Save the merged purchases back to localStorage and Redis
        console.log('Replaced cart data from Redis:', cart);
        console.log('Replaced purchases data from Redis:', purchases);

        localStorage.setItem('cart', JSON.stringify(cart));
        localStorage.setItem('purchases', JSON.stringify(purchases))

        purchases = purchases.filter((purchase, index, self) =>
            index === self.findIndex(p => (
                p.foodName === purchase.foodName && p.time === purchase.time
            ))
        );

        // Step 4: Render the updated purchases and cart
        renderCart(cart);
        renderPurchases(purchases);

        updateTotalPrice(purchases);  // Call the function here to update the total price

    } catch (error) {
        console.error('Error syncing data:', error);
        alert('Failed to sync data. Please try again later.');
    }
}


/**
 * Render the cart items
 */
function renderCart(cart) {
    cart.forEach(item => {
        const cartOption = document.createElement('option');
        cartOption.textContent = `${item.foodName} - Quantity: ${item.quantity}, Price: ${item.itemTotalPrice}, Note: ${item.cartNote || '-'}`;
        cartOption.value = item.foodName; // Optionally set the value to the food name or any unique identifier
        
        // Append the option to the foodSelect element
        foodSelect.appendChild(cartOption);
    });
}
/**
 * Render the purchases with a status dropdown aligned to the right
 */
function renderPurchases(purchases) {
    const foodItems = document.getElementById('foodItems');
    const completedItems = document.getElementById('completedItems');
    foodItems.innerHTML = ''; // Clear the current purchases display
    completedItems.innerHTML = ''; // Clear the completed purchases display

    totalPrice = 0; // Reset total price before recalculating
    completedTotalPrice = 0; // Reset completed total price

    purchases.forEach((purchase, index) => {
        const foodItem = document.createElement('li');
        foodItem.classList.add('purchase-item');

        const contentContainer = document.createElement('div');
        contentContainer.classList.add('content-container');
        contentContainer.textContent = `${purchase.transactionNumber} - ${purchase.foodName} - Quantity: ${purchase.quantity}, Total Price: ${purchase.itemTotalPrice}, Added at: ${purchase.time}, Note: ${purchase.cartNote || '-'}`;

        // Create the status dropdown
        const statusDropdown = document.createElement('select');
        statusDropdown.classList.add('status-dropdown');
        
        const pendingOption = document.createElement('option');
        pendingOption.value = 'pending';
        pendingOption.textContent = 'Pending';

        const completedOption = document.createElement('option');
        completedOption.value = 'completed';
        completedOption.textContent = 'Completed';

        // Set the current status as selected and adjust total price
        if (purchase.status === 'completed') {
            completedOption.selected = true;
            completedTotalPrice += parseFloat(purchase.itemTotalPrice); // Add to completed total price
        } else {
            pendingOption.selected = true;
            totalPrice += parseFloat(purchase.itemTotalPrice); // Add to pending total price
        }

        statusDropdown.appendChild(pendingOption);
        statusDropdown.appendChild(completedOption);

        // Add event listener to update the status when the dropdown changes
        statusDropdown.addEventListener('change', function () {
            updatePurchaseStatus(index, statusDropdown.value); // Update the status in localStorage and Redis
        });

        // Append content and dropdown to the list item
        foodItem.appendChild(contentContainer);
        foodItem.appendChild(statusDropdown);

        // Append the item to the correct list (pending or completed)
        if (purchase.status === 'completed') {
            completedItems.appendChild(foodItem); // Add to completed section
        } else {
            foodItems.appendChild(foodItem); // Add to pending section
        }
    });

    // Update the total orders display
    updateTotalPrice();
}


/**
 * Update the purchase status in localStorage and Redis
 */
function updatePurchaseStatus(index, newStatus) {
    let purchases = JSON.parse(localStorage.getItem('purchases')) || [];

    if (purchases[index]) {
        const oldStatus = purchases[index].status;
        const itemTotalPrice = parseFloat(purchases[index].itemTotalPrice);

        // Update the status in the localStorage
        purchases[index].status = newStatus;
        localStorage.setItem('purchases', JSON.stringify(purchases));

        // Save updated purchases to Redis
        savePurchasesToRedis(purchases);

        // Update the total price based on status change
        if (oldStatus === 'pending' && newStatus === 'completed') {
            totalPrice -= itemTotalPrice;
            completedTotalPrice += itemTotalPrice;
        } else if (oldStatus === 'completed' && newStatus === 'pending') {
            totalPrice += itemTotalPrice;
            completedTotalPrice -= itemTotalPrice;
        }

        // Update the total orders display
        updateTotalPrice();

        // Re-render the purchases to reflect the updated status
        renderPurchases(purchases);

        console.log(`Purchase status updated to ${newStatus} for item at index ${index}`);
    }
}

checkOrderStatusButton.addEventListener('click', function () {
    checkOrderStatus();
});



function markOrderAsCompleted(purchaseIndex) {
    let purchases = JSON.parse(localStorage.getItem('purchases')) || [];

    if (purchases[purchaseIndex]) {
        purchases[purchaseIndex].status = 'completed';
        localStorage.setItem('purchases', JSON.stringify(purchases));

        // Optionally, update Redis as well
        savePurchasesToRedis(purchases);

        // Re-render the purchases to reflect the completed order
        renderPurchases(purchases);
    }
}

/**
 * Event Listener: Add to Cart Button
 */
addToCartButton.addEventListener('click', function () {
    const selectedOption = foodSelect.options[foodSelect.selectedIndex];
    const foodName = selectedOption.value;
    const price = parseFloat(selectedOption.getAttribute('data-price'));
    const quantity = parseInt(quantityInput.value);
    const cartNote = document.getElementById('cartNote').value;

    if (!foodName || quantity <= 0 || isNaN(quantity)) {
        alert("Please select a food item and enter a valid quantity.");
        return;
    }

    const itemTotalPrice = (price * quantity).toFixed(2);

    const cartItem = {
        foodName,
        quantity,
        itemTotalPrice,
        cartNote
    };

    cart.push(cartItem);

    cartTotalPrice += parseFloat(itemTotalPrice);
    cartTotalPriceDisplay.textContent = `Cart Total: Rp ${cartTotalPrice.toFixed(2)}`;
    
    const cartListItem = document.createElement('li');
    cartListItem.textContent = `${foodName} - Quantity: ${quantity}, Price: ${itemTotalPrice}, Note: ${cartNote || '-'}`;
    cartItems.appendChild(cartListItem);

    saveCartToRedis(cart);
    foodForm.reset();
});

/**
 * Event Listener: Form Submission
 */
foodForm.addEventListener('submit', function (event) {
    event.preventDefault();

    if (cart.length === 0) {
        alert("Please add items to the cart before submitting.");
        return;
    }

    const now = new Date();
    const time = now.toLocaleTimeString();

    // Load existing purchases from localStorage to accumulate total
    let existingPurchases = JSON.parse(localStorage.getItem('purchases')) || [];

    cart.forEach(item => {
        const foodItem = document.createElement('li');
        foodItem.textContent = `${item.foodName} - Quantity: ${item.quantity}, Total Price: Rp ${item.itemTotalPrice}, Added at: ${time}, Note : ${item.cartNote || '-'}`;
        foodItems.appendChild(foodItem);

        totalPrice += parseFloat(item.itemTotalPrice);  // Accumulate the total for the current cart items
    });

    // Add the total from existing purchases
    const existingTotalPrice = existingPurchases.reduce((total, purchase) => total + parseFloat(purchase.itemTotalPrice), 0);
    totalPrice += existingTotalPrice;

    updateTotalPrice();

    cart.forEach(item => {
        savePurchase(item.foodName, item.quantity, item.itemTotalPrice, time, item.cartNote || '-', item.status);
    });

    cart = [];
    cartItems.innerHTML = '';
    saveCartToRedis(cart);

    // Reset the cart total price
    cartTotalPrice = 0;
    cartTotalPriceDisplay.textContent = `Cart Total: Rp ${cartTotalPrice.toFixed(2)}`;
    foodForm.reset();
});

/**
 * Load saved cart and purchases from Redis and localStorage on page load
 */
document.addEventListener('DOMContentLoaded', function () {
    loadCartFromRedis();
    loadSavedPurchases();
});

/**
 * Event Listener: Sync Button
 */
syncButton.addEventListener('click', async function () {
    await syncData();
});
