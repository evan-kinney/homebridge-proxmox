<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable-next-line MD041 -->
<p align="center">
  <img src="https://www.proxmox.com/images/proxmox/Proxmox-logo.png" alt="Proxmox Logo">
</p>
<!-- markdownlint-enable MD033 -->

# Homebridge Proxmox plugin

[![npm](https://img.shields.io/npm/v/homebridge-proxmox.svg)](https://www.npmjs.com/package/@evan-kinney/homebridge-proxmox)
[![npm](https://img.shields.io/npm/dt/homebridge-proxmox.svg)](https://www.npmjs.com/package/@evan-kinney/homebridge-proxmox)

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

```json
{
  "platform": "HomebridgeProxmox",
  "servers": [
    {
      "name": "Main Proxmox",
      "host": "192.168.1.100",
      "username": "root@pam",
      "password": "your-password",
      "ssl": true
    },
    {
      "name": "Secondary Proxmox",
      "host": "192.168.1.101",
      "username": "root@pam", 
      "password": "your-password",
      "ssl": false
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
- **username** (required): Username for Proxmox authentication (e.g., "root@pam")
- **password** (required): Password for Proxmox authentication
- **ssl** (required): Whether to accept self-signed SSL certificates (true/false)

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
