import { Command } from 'commander';
import ora from 'ora';
import { api } from './api';
import { getConfig, getStoredCredentials, saveConfig, clearConfig } from './config';
import { encrypt, decrypt } from './crypto';

export function createCommands(): Command {
  const program = new Command();

  program
    .name('chat')
    .description('Chat CLI - Send messages to your partner')
    .version('1.0.0');

  program
    .command('register')
    .description('Register a new account')
    .requiredOption('-e, --email <email>', 'Email address')
    .requiredOption('-p, --password <password>', 'Password')
    .requiredOption('-n, --nickname <nickname>', 'Nickname')
    .option('-pe, --partner-email <email>', 'Partner email (optional)')
    .action(async (options) => {
      const spinner = ora('Registering...').start();
      try {
        const { token, user } = await api.register(
          options.email,
          options.password,
          options.nickname,
          options.partnerEmail
        );
        api.setToken(token);
        saveConfig({ token, userId: user.id, email: options.email, password: options.password });
        spinner.succeed(`Registered as ${user.nickname} (${user.email})`);
      } catch (error: any) {
        spinner.fail(error.response?.data?.error || 'Registration failed');
        process.exit(1);
      }
    });

  program
    .command('login')
    .description('Login to your account')
    .requiredOption('-e, --email <email>', 'Email address')
    .requiredOption('-p, --password <password>', 'Password')
    .action(async (options) => {
      const spinner = ora('Logging in...').start();
      try {
        const { token, user } = await api.login(options.email, options.password);
        api.setToken(token);
        saveConfig({ token, userId: user.id, email: options.email, password: options.password });
        spinner.succeed(`Logged in as ${user.nickname}`);
      } catch (error: any) {
        spinner.fail(error.response?.data?.error || 'Login failed');
        process.exit(1);
      }
    });

  program
    .command('logout')
    .description('Logout and delete your messages')
    .action(async () => {
      const spinner = ora('Logging out...').start();
      try {
        const config = getConfig();
        if (config.token) {
          api.setToken(config.token);
          await api.logout();
        }
        api.clearToken();
        clearConfig();
        spinner.succeed('Logged out and messages deleted');
      } catch (error: any) {
        spinner.fail(error.response?.data?.error || 'Logout failed');
        process.exit(1);
      }
    });

  program
    .command('send')
    .description('Send a message to your partner')
    .argument('<message>', 'Message to send')
    .action(async (message) => {
      const spinner = ora('Sending message...').start();
      try {
        const config = getConfig();
        const credentials = getStoredCredentials();
        if (!config.token || !credentials) {
          spinner.fail('Not logged in. Run "chat login" first.');
          process.exit(1);
        }
        api.setToken(config.token);
        const { ciphertext, iv } = encrypt(message, credentials.password);
        await api.sendMessage(ciphertext, iv);
        spinner.succeed('Message sent!');
      } catch (error: any) {
        spinner.fail(error.response?.data?.error || 'Failed to send message');
        process.exit(1);
      }
    });

  program
    .command('list')
    .description('List all messages')
    .option('-l, --limit <number>', 'Number of messages to fetch', '50')
    .action(async (options) => {
      const spinner = ora('Fetching messages...').start();
      try {
        const config = getConfig();
        const credentials = getStoredCredentials();
        if (!config.token || !credentials) {
          spinner.fail('Not logged in. Run "chat login" first.');
          process.exit(1);
        }
        api.setToken(config.token);
        const messages = await api.getMessages(parseInt(options.limit));
        if (messages.length === 0) {
          spinner.succeed('No messages yet');
          return;
        }
        const userId = config.userId;
        console.log('\n--- Messages ---\n');
        for (const msg of messages) {
          const isSent = msg.senderId === userId;
          const decrypted = decrypt({ ciphertext: msg.content, iv: msg.iv }, credentials.password);
          const time = new Date(msg.createdAt).toLocaleString();
          const prefix = isSent ? '→' : '←';
          console.log(`[${time}] ${prefix} ${decrypted}`);
        }
        console.log('');
        spinner.stop();
      } catch (error: any) {
        spinner.fail(error.response?.data?.error || 'Failed to fetch messages');
        process.exit(1);
      }
    });

  program
    .command('sync')
    .description('Sync and display new messages')
    .action(async () => {
      const spinner = ora('Syncing...').start();
      try {
        const config = getConfig();
        const credentials = getStoredCredentials();
        if (!config.token || !credentials) {
          spinner.fail('Not logged in. Run "chat login" first.');
          process.exit(1);
        }
        api.setToken(config.token);
        const messages = await api.syncMessages();
        if (messages.length === 0) {
          spinner.succeed('No new messages');
          return;
        }
        const userId = config.userId;
        console.log('\n--- New Messages ---\n');
        for (const msg of messages) {
          const isSent = msg.senderId === userId;
          const decrypted = decrypt({ ciphertext: msg.content, iv: msg.iv }, credentials.password);
          const time = new Date(msg.createdAt).toLocaleString();
          const prefix = isSent ? '→' : '←';
          console.log(`[${time}] ${prefix} ${decrypted}`);
        }
        console.log('');
        spinner.succeed(`Synced ${messages.length} message(s)`);
      } catch (error: any) {
        spinner.fail(error.response?.data?.error || 'Sync failed');
        process.exit(1);
      }
    });

  const partnerCmd = program.command('partner').description('Manage partner connection');

  partnerCmd
    .command('connect')
    .description('Connect to a partner by email')
    .requiredOption('-e, --email <email>', 'Partner email')
    .action(async (options) => {
      const spinner = ora('Connecting to partner...').start();
      try {
        const config = getConfig();
        if (!config.token) {
          spinner.fail('Not logged in. Run "chat login" first.');
          process.exit(1);
        }
        api.setToken(config.token);
        await api.connectPartner(options.email);
        spinner.succeed(`Connected to ${options.email}`);
      } catch (error: any) {
        spinner.fail(error.response?.data?.error || 'Failed to connect');
        process.exit(1);
      }
    });

  partnerCmd
    .command('show')
    .description('Show current partner info')
    .action(async () => {
      const spinner = ora('Fetching partner...').start();
      try {
        const config = getConfig();
        if (!config.token) {
          spinner.fail('Not logged in. Run "chat login" first.');
          process.exit(1);
        }
        api.setToken(config.token);
        const partner = await api.getPartner();
        spinner.succeed(`${partner.nickname} (${partner.email})`);
      } catch (error: any) {
        spinner.fail(error.response?.data?.error || 'No partner found');
        process.exit(1);
      }
    });

  return program;
}