// Quick test to isolate the balance calculation issue
const { calculateAccountBalance } = require('./server/account-balance-sync');

async function testBalance() {
  try {
    const result = await calculateAccountBalance(63, 1);
    console.log('Test result:', result);
  } catch (error) {
    console.error('Test error:', error);
  }
}

testBalance();