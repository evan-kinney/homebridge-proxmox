import { API, DynamicPlatformPlugin, Logger, PlatformAccessory, PlatformConfig, Service, Characteristic } from 'homebridge'

import { PLATFORM_NAME, PLUGIN_NAME } from './settings'
import { ProxmoxPlatformAccessory } from './platformAccessory'

import proxmoxApi, { Proxmox } from 'proxmox-api'

interface ProxmoxServer {
	name: string
	username: string
	password: string
	host: string
	ssl: boolean
}

interface ServerConnection {
	server: ProxmoxServer
	api: Proxmox.Api
	nodes: Proxmox.nodesIndex[]
}

/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
export class HomebridgeProxmoxPlatform implements DynamicPlatformPlugin {
	public readonly Service: typeof Service = this.api.hap.Service
	public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic

	// this is used to track restored cached accessories
	public readonly accessories: PlatformAccessory[] = []
	public readonly serverConnections: ServerConnection[] = []

	constructor(
		public readonly log: Logger,
		public readonly config: PlatformConfig,
		public readonly api: API,
	) {
		// Initialize server connections
		if (!this.config.servers || !Array.isArray(this.config.servers)) {
			this.log.error('No servers configured. Please configure at least one Proxmox server.')
			return
		}

		// Initialize connections for each server
		for (const server of this.config.servers as ProxmoxServer[]) {
			// authorize self signed cert if you do not use a valid SSL certificat
			if (server.ssl) {
				process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
			}

			const api = proxmoxApi({ host: server.host, password: server.password, username: server.username })
			this.serverConnections.push({
				server,
				api,
				nodes: [],
			})
		}

		if (this.config.debug) this.log.debug('Finished initializing platform')

		// When this event is fired it means Homebridge has restored all cached accessories from disk.
		// Dynamic Platform plugins should only register new accessories after this event was fired,
		// in order to ensure they weren't added to homebridge already. This event can also be used
		// to start discovery of new accessories.
		this.api.on('didFinishLaunching', async () => {
			// run the method to discover / register your devices as accessories
			await this.initializeConnections()
			await this.setup()
			if (this.config.debug) this.log.debug('Executed didFinishLaunching callback')
		})
	}

	async initializeConnections() {
		for (const connection of this.serverConnections) {
			try {
				connection.nodes = await connection.api.nodes.$get()
				this.log.info(`Connected to Proxmox server: ${connection.server.name} (${connection.server.host})`)
			} catch (error) {
				this.log.error(`Failed to connect to Proxmox server ${connection.server.name} (${connection.server.host}):`, error)
			}
		}
	}

	async setup() {
		for (const connection of this.serverConnections) {
			if (connection.nodes.length === 0) {
				this.log.warn(`No nodes found for server ${connection.server.name}, skipping...`)
				continue
			}

			for (const node of connection.nodes) {
				const theNode = connection.api.nodes.$(node.node)

				try {
					// list Qemu VMS
					const qemus = await theNode.qemu.$get({ full: true })

					// iterate Qemu VMS
					for (const qemu of qemus) {
						// do some suff.
						const status = await theNode.qemu.$(qemu.vmid).status.current.$get()
						this.registerDevice(qemu, status.name as string, node.node, true, false, connection.server.name)
					}

					const lxcs = await theNode.lxc.$get()
					for (const lxc of lxcs) {
						const status = await theNode.lxc.$(lxc.vmid).status.current.$get()
						this.registerDevice(lxc, status.name as string, node.node, false, true, connection.server.name)
					}
				} catch (error) {
					this.log.error(`Error processing node ${node.node} on server ${connection.server.name}:`, error)
				}
			}
		}
	}

	/**
	 * This function is invoked when homebridge restores cached accessories from disk at startup.
	 * It should be used to setup event handlers for characteristics and update respective values.
	 */
	configureAccessory(accessory: PlatformAccessory) {
		this.log.info('Loading accessory from cache:', accessory.displayName)

		// add the restored accessory to the accessories cache so we can track if it has already been registered
		this.accessories.push(accessory)
	}

	/**
	 * This is an example method showing how to register discovered accessories.
	 * Accessories must only be registered once, previously created accessories
	 * must not be registered again to prevent "duplicate UUID" errors.
	 */
	registerDevice(
		vm: Proxmox.nodesQemuVm | Proxmox.nodesLxcVm,
		name: string,
		nodeName: string,
		isQemu: boolean,
		isLxc: boolean,
		serverName: string,
	) {

		// EXAMPLE ONLY
		// A real plugin you would discover accessories from the local network, cloud services
		// or a user-defined array in the platform config.

		// Include server name in UUID to ensure uniqueness across servers
		const uuid = this.api.hap.uuid.generate(`${serverName}-${vm.vmid}-${name}`)
		const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid)

		if (existingAccessory) {
			// the accessory already exists
			this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName)

			// create the accessory handler for the restored accessory
			// this is imported from `platformAccessory.ts`
			new ProxmoxPlatformAccessory(this, existingAccessory)


		} else {
			// the accessory does not yet exist, so we need to create it
			this.log.info('Adding new accessory:', name)

			// create a new accessory
			const accessory = new this.api.platformAccessory(name, uuid)

			// store a copy of the device object in the `accessory.context`
			// the `context` property can be used to store any data about the accessory you may need
			accessory.context.device = {
				vmId: vm.vmid,
				vmName: name,
				nodeName,
				isQemu,
				isLxc,
				serverName,
			}

			// create the accessory handler for the newly create accessory
			// this is imported from `platformAccessory.ts`
			new ProxmoxPlatformAccessory(this, accessory)

			// link the accessory to your platform
			this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory])
		}
	}

	/**
	 * Get server connection by server name
	 */
	getServerConnection(serverName: string): ServerConnection | undefined {
		return this.serverConnections.find(connection => connection.server.name === serverName)
	}
}
