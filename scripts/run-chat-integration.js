#!/usr/bin/env node

/**
 * Helper script to run the chat app integration test.
 * This allows easy execution of the integration test server.
 */

console.log('Starting chat app integration test server...');

// Import and run the integration test
import('../src/tests/chat-app-integration.js')
  .then(_module => {
    console.log('Test module loaded.');
  })
  .catch(error => {
    console.error('Error running integration test:', error);
    process.exit(1);
  }); 