<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable-next-line MD041 -->
<p align="center">
  <img src="https://www.proxmox.com/images/proxmox/Proxmox-logo.png" alt="Proxmox Logo">
</p>
<!-- markdownlint-enable MD033 -->

# Homebridge Proxmox plugin

[![npm](https://img.shields.io/npm/v/@evan-kinney/homebridge-proxmox.svg)](https://www.npmjs.com/package/@evan-kinney/homebridge-proxmox)
[![npm](https://img.shields.io/npm/dt/@evan-kinney/homebridge-proxmox.svg)](https://www.npmjs.com/package/@evan-kinney/homebridge-proxmox)

Proxmox plugin for Homebridge. This plugin adds switches that control status (on/off) of LXC/QEMU machines across multiple Proxmox servers.

## Features

- **Multiple Server Support**: Connect to multiple Proxmox servers simultaneously
- **LXC Container Control**: Start/stop LXC containers from HomeKit
- **QEMU VM Control**: Start/stop QEMU virtual machines from HomeKit
- **Real-time Status**: Get current VM/container status in HomeKit
- **Auto-discovery**: Automatically discovers all VMs and containers from all configured servers

## Requirements

- [Homebridge](https://github.com/homebridge/homebridge) - _HomeKit support for the impatient_
- [Proxmox instance(s)](https://www.proxmox.com/en/) - _Proxmox Virtual Environment_

## Configuration

### New Configuration Format (Multiple Servers)

#### Using Password Authentication
```json
{
  "platform": "HomebridgeProxmox",
  "servers": [
    {
      "name": "Main Proxmox",
      "host": "192.168.1.100",
      "port": 8006,
      "username": "root@pam",
      "password": "your-password",
      "ssl": true
    }
  ],
  "debug": false
}
```

#### Using API Token Authentication (Recommended)
```json
{
  "platform": "HomebridgeProxmox",
  "servers": [
    {
      "name": "Proxmox Server",
      "host": "192.168.1.100",
      "port": 8006,
      "username": "homebridge@pve",
      "apiToken": {
        "tokenId": "homebridge@pve!homebridge-token",
        "secret": "your-api-token-secret"
      },
      "ssl": true
    }
  ],
  "debug": false
}
```

### Migration from Single Server

If you're upgrading from a previous version that supported only one server, you'll need to update your configuration. The old format:

```json
{
  "platform": "HomebridgeProxmox",
  "host": "192.168.1.100",
  "username": "root@pam",
  "password": "your-password",
  "ssl": true,
  "debug": false
}
```

Should be converted to the new format:

```json
{
  "platform": "HomebridgeProxmox",
  "servers": [
    {
      "name": "My Proxmox Server",
      "host": "192.168.1.100",
      "port": 8006,
      "username": "root@pam",
      "password": "your-password",
      "ssl": true
    }
  ],
  "debug": false
}
```

### Configuration Options

#### Server Configuration

- **name** (required): A unique identifier for the Proxmox server
- **host** (required): IP address or hostname of the Proxmox server
- **port** (optional): Port number for the Proxmox server (default: 8006)
- **username** (required): Username for Proxmox authentication (e.g., "root@pam")
- **password** (optional): Password for Proxmox authentication
- **apiToken** (optional): API token for authentication (alternative to password)
  - **tokenId** (required): API Token ID (format: `user@realm!tokenname`)
  - **secret** (required): API Token Secret
- **ssl** (required): Whether to accept self-signed SSL certificates (true/false)

**Note**: You must provide either `password` or `apiToken` for authentication. API tokens are recommended for better security.

#### Global Options

- **debug** (optional): Enable debug logging (true/false, default: false)

## Installation

1. Install the plugin through Homebridge Config UI X or manually:

   ```bash
   npm install -g homebridge-proxmox
   ```

2. Configure the plugin with your Proxmox server details

3. Restart Homebridge

## How it Works

1. The plugin connects to all configured Proxmox servers on startup
2. It discovers all VMs and LXC containers across all servers
3. Each VM/container appears as a switch in HomeKit
4. Turning the switch on/off starts/stops the corresponding VM/container
5. The switch status reflects the current state of the VM/container

## Troubleshooting

- **Connection Issues**: Check that the Proxmox server is accessible and credentials are correct
- **SSL Errors**: If using self-signed certificates, ensure `ssl: true` is set for that server
- **Missing VMs**: Verify that the user has sufficient permissions in Proxmox
- **Duplicate Names**: Each server should have a unique name to avoid conflicts

## Development

### Setup Development Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/evan-kinney/homebridge-proxmox.git
   cd homebridge-proxmox
   ```

2. Run the setup script:
   ```bash
   ./dev-setup.sh
   ```

3. Update `.homebridge/config.json` with your Proxmox server details

4. Start development:
   ```bash
   npm run dev
   ```

### Development Scripts

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build the TypeScript code
- `npm run watch` - Watch for changes and rebuild
- `npm run homebridge:dev` - Run Homebridge with the plugin
- `npm run homebridge:debug` - Run Homebridge with full debug output
- `npm run test:config` - Test Homebridge configuration without QR code
- `npm run clean` - Clean build artifacts and Homebridge cache
- `npm run lint` - Run ESLint

### VS Code Development

The repository includes VS Code configurations for:

- **Tasks**: Build, watch, and run Homebridge
- **Launch Configurations**: Debug Homebridge with breakpoints
- **Settings**: TypeScript and ESLint integration

Use `Ctrl+Shift+P` → "Tasks: Run Task" → "Development Server" to start developing.

### Project Structure

```
src/
├── index.ts           # Plugin entry point
├── platform.ts       # Main platform class with multi-server support
├── platformAccessory.ts  # Individual accessory handling
└── settings.ts        # Plugin constants

.homebridge/           # Development Homebridge configuration
├── config.json        # Test configuration (update with real servers)
└── README.md          # Development setup instructions

.vscode/               # VS Code configuration
├── tasks.json         # Build and run tasks
└── launch.json        # Debug configurations
```

### Testing

1. Update `.homebridge/config.json` with test server details
2. Run `npm run homebridge:dev` to test the plugin
3. Use iOS Home app or Homebridge UI to verify functionality
4. Check logs for any errors or warnings

### Debugging

- Set breakpoints in VS Code and use "Debug Homebridge" launch configuration
- Enable debug logging with `"debug": true` in configuration
- Use `npm run homebridge:debug` for verbose output
- Check `.homebridge/` directory for Homebridge logs and state

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using the development environment
5. Submit a pull request

### Creating API Tokens in Proxmox

API tokens provide a more secure way to authenticate with Proxmox than using passwords. Here's how to create them:

1. **Log into Proxmox Web Interface** as an administrator

2. **Navigate to Datacenter → Permissions → API Tokens**

3. **Click "Add"** to create a new API token

4. **Configure the token:**
   - **User**: Select or create a user (e.g., `homebridge@pve`)
   - **Token ID**: Give it a meaningful name (e.g., `homebridge-token`)
   - **Privilege Separation**: Uncheck this if you want the token to have the same permissions as the user
   - **Comment**: Optional description

5. **Set Permissions**: Ensure the user has appropriate permissions:
   - **Path**: `/` (or specific paths for VMs/containers)
   - **Role**: `PVEVMAdmin` or custom role with necessary permissions
   - **Propagate**: Check this to apply to child objects

6. **Copy the Token**: After creation, copy both the Token ID and Secret immediately (the secret is only shown once)

7. **Use in Configuration**: The Token ID format should be `user@realm!tokenname` (e.g., `homebridge@pve!homebridge-token`)

#### Required Permissions

The API token/user needs these minimum permissions:
- **VM.Monitor**: To read VM/container status
- **VM.PowerMgmt**: To start/stop VMs/containers
- **Sys.Audit**: To list nodes and resources
