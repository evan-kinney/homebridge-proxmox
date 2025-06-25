/* eslint-disable max-len */
import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge'

import { HomebridgeProxmoxPlatform, AccessoryType } from './platform'
import { PLUGIN_NAME, PLATFORM_NAME } from './settings'

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class ProxmoxPlatformAccessory {
	private service: Service

	/**
	 * These are just used to create a working example
	 * You should implement your own code to track the state of your accessory
	 */
	private state = false
	private context: {
		vmId: number
		vmName: string
		nodeName: string
		isQemu: boolean
		isLxc: boolean
		serverName: string
		accessoryType: AccessoryType
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private node: any
	private isNodeReady = false
	private lastUpdateDate: Date
	private pollingTimer?: NodeJS.Timeout

	constructor(
		private readonly platform: HomebridgeProxmoxPlatform,
		private readonly accessory: PlatformAccessory
	) {

		const context = this.accessory.context.device
		this.context = {
			vmId: context.vmId,
			vmName: context.vmName,
			nodeName: context.nodeName,
			isQemu: context.isQemu,
			isLxc: context.isLxc,
			serverName: context.serverName,
			accessoryType: context.accessoryType
		}
		const date = new Date()
		date.setSeconds(date.getSeconds() - 11)
		this.lastUpdateDate = date

		this.setup()

		// set accessory information
		this.accessory.getService(this.platform.Service.AccessoryInformation)!
			.setCharacteristic(this.platform.Characteristic.Manufacturer, 'Proxmox VE')
			.setCharacteristic(this.platform.Characteristic.Model, this.context.isQemu ? 'QEMU VM' : 'LXC Container')

		// Create the appropriate service based on accessory type
		this.service = this.createService()

		// set the service name, this is what is displayed as the default name on the Home app
		// in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
		this.service.setCharacteristic(this.platform.Characteristic.Name, this.context.vmName)

		// each service must implement at-minimum the "required characteristics" for the given service type
		// register handlers for the On/Off Characteristic (common to all service types)
		this.service.getCharacteristic(this.platform.Characteristic.On)
			.onSet(this.setOn.bind(this))                // SET - bind to the `setOn` method below
			.onGet(this.getOn.bind(this))               // GET - bind to the `getOn` method below

		// Start background polling if configured
		this.startPolling()
	}

	private async setup() {
		const serverConnection = this.platform.getServerConnection(this.context.serverName)
		if (!serverConnection) {
			this.platform.log.error(`Server connection not found for server: ${this.context.serverName}`)
			this.platform.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [this.accessory])
			return
		}

		for (const node of serverConnection.nodes) {
			// Skip if this is not the node we're looking for
			if (node.node !== this.context.nodeName) {
				continue
			}

			const theNode = serverConnection.api.nodes.$(node.node)

			try {
				if (this.context.isQemu) {
					if (this.platform.config.debug) this.platform.log.debug(`${this.accessory.displayName} SETUP isQemu`)

					// list Qemu VMS with error handling
					const qemus = await theNode.qemu.$get({ full: true })
					const found = qemus.find(x => x.vmid === this.context.vmId) !== undefined
					if (found) {
						if (this.platform.config.debug) this.platform.log.debug(`${this.accessory.displayName} SETUP isQemu -> found correct qemu`)
						this.node = theNode
						this.isNodeReady = true
						return // Successfully found and configured
					}
				}

				if (this.context.isLxc) {
					if (this.platform.config.debug) this.platform.log.debug(`${this.accessory.displayName} SETUP isLxc`)

					// list Lxc VMS with error handling
					const lxcs = await theNode.lxc.$get()
					const found = lxcs.find(x => x.vmid === this.context.vmId) !== undefined
					if (found) {
						if (this.platform.config.debug) this.platform.log.debug(`${this.accessory.displayName} SETUP isLxc -> found correct lxc`)
						this.node = theNode
						this.isNodeReady = true
						return // Successfully found and configured
					}
				}
			} catch (error) {
				this.platform.log.warn(`${this.accessory.displayName} - Node ${this.context.nodeName} is unreachable: ${error}`)
				// Don't unregister the accessory immediately - the node might come back online
				this.isNodeReady = false
				return
			}
		}

		// If we get here, either the node wasn't found or VM/container wasn't found
		if (!this.isNodeReady) {
			this.platform.log.warn(`${this.accessory.displayName} - VM/Container ${this.context.vmId} not found on node ${this.context.nodeName}. Keeping accessory for when node comes back online.`)
		}
	}

	/**
	 * Cleanup when accessory is removed
	 */
	destroy() {
		this.stopPolling()
		if (this.platform.config.debug) {
			this.platform.log.debug(`${this.accessory.displayName} - Accessory destroyed, polling stopped`)
		}
	}

	/**
	 * Handle "SET" requests from HomeKit
	 * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
	 */
	async setOn(value: CharacteristicValue) {
		const bool = value as boolean
		if (this.platform.config.debug) this.platform.log.debug(`${this.accessory.displayName} setOn: ${bool}`)
		this.lastUpdateDate = new Date()
		this.switchState(bool)
	}

	private async switchState(state: boolean) {
		if (!this.isNodeReady) {
			this.platform.log.warn(`${this.accessory.displayName} - Cannot switch state: node ${this.context.nodeName} is not ready`)
			return
		}
		let switched = false

		if (this.context.isQemu) {
			try {
				if (state) await this.node.qemu.$(this.context.vmId).status.start.$post()
				else await this.node.qemu.$(this.context.vmId).status.stop.$post()
				switched = true
			} catch (error) {
				this.platform.log.error(`${this.accessory.displayName} - Failed to ${state ? 'start' : 'stop'} QEMU VM: ${error}`)
				this.isNodeReady = false // Mark node as not ready for future operations
			}
		}

		if (this.context.isLxc) {
			try {
				if (state) await this.node.lxc.$(this.context.vmId).status.start.$post()
				else await this.node.lxc.$(this.context.vmId).status.stop.$post()
				switched = true
			} catch (error) {
				this.platform.log.error(`${this.accessory.displayName} - Failed to ${state ? 'start' : 'stop'} LXC container: ${error}`)
				this.isNodeReady = false // Mark node as not ready for future operations
			}
		}

		if (switched) {
			this.state = state
			this.service.updateCharacteristic(this.platform.Characteristic.On, state)
			if (this.platform.config.debug) this.platform.log.debug(`${this.accessory.displayName} switchState success and current state is: ${state}`)
		}
	}

	/**
	 * Handle the "GET" requests from HomeKit
	 * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
	 *
	 * GET requests should return as fast as possbile. A long delay here will result in
	 * HomeKit being unresponsive and a bad user experience in general.
	 *
	 * If your device takes time to respond you should update the status of your device
	 * asynchronously instead using the `updateCharacteristic` method instead.

	 * @example
	 * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
	 */
	getOn(): CharacteristicValue {
		// if you need to return an error to show the device as "Not Responding" in the Home app:
		// throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE)
		if (Math.abs((new Date().getTime() - this.lastUpdateDate.getTime()) / 1000) < 10) return this.state

		if (this.platform.config.debug) this.platform.log.debug(`${this.accessory.displayName} getOn`)
		this.fetchState().catch(() => {
			throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE)
		})
		return this.state
	}

	/**
	 * Return state async and set it
	 */
	private async fetchState(bypassCache = false) {
		if (!this.isNodeReady) {
			// Node is not ready, throw communication failure to show "Not Responding"
			throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE)
		}

		// Use cache unless bypassed (for polling) or cache is expired
		if (!bypassCache && Math.abs((new Date().getTime() - this.lastUpdateDate.getTime()) / 1000) < 10) {
			return this.state
		}

		let isOn = false
		let status = ''

		try {
			if (this.context.isQemu) {
				const res = await this.node.qemu.$(this.context.vmId).status.current.$get()
				status = res.status
			}

			if (this.context.isLxc) {
				const res = await this.node.lxc.$(this.context.vmId).status.current.$get()
				status = res.status
			}

			if (status === 'stopped') {
				isOn = false
			}
			if (status === 'running') {
				isOn = true
			}

			if (this.platform.config.debug) this.platform.log.debug(`${this.accessory.displayName} fetchState: status is ${status}, state is: ${isOn}`)
			this.state = isOn
			this.service.updateCharacteristic(this.platform.Characteristic.On, isOn)
			return isOn
		} catch (error) {
			this.platform.log.warn(`${this.accessory.displayName} - Failed to fetch state from node ${this.context.nodeName}: ${error}`)
			// Mark node as not ready and throw communication failure
			this.isNodeReady = false
			throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE)
		}
	}

	/**
	 * Create the appropriate HomeKit service based on the accessory type
	 */
	private createService(): Service {
		let service: Service

		switch (this.context.accessoryType) {
			case AccessoryType.OUTLET:
				service = this.accessory.getService(this.platform.Service.Outlet) ||
					this.accessory.addService(this.platform.Service.Outlet)
				break
			case AccessoryType.LIGHTBULB:
				service = this.accessory.getService(this.platform.Service.Lightbulb) ||
					this.accessory.addService(this.platform.Service.Lightbulb)
				break
			case AccessoryType.FAN:
				service = this.accessory.getService(this.platform.Service.Fan) ||
					this.accessory.addService(this.platform.Service.Fan)
				break
			case AccessoryType.SWITCH:
			default:
				service = this.accessory.getService(this.platform.Service.Switch) ||
					this.accessory.addService(this.platform.Service.Switch)
				break
		}

		return service
	}

	/**
	 * Start background polling for VM status updates
	 */
	private startPolling() {
		const pollingInterval = this.platform.config.pollingInterval as number

		// Don't start polling if disabled (0 or undefined) or interval is too short
		if (!pollingInterval || pollingInterval < 10) {
			if (this.platform.config.debug) {
				this.platform.log.debug(`${this.accessory.displayName} - Polling disabled`)
			}
			return
		}

		if (this.platform.config.debug) {
			this.platform.log.debug(`${this.accessory.displayName} - Starting polling every ${pollingInterval} seconds`)
		}

		// Clear any existing timer
		this.stopPolling()

		// Start new polling timer
		this.pollingTimer = setInterval(async () => {
			try {
				await this.pollState()
			} catch (error) {
				if (this.platform.config.debug) {
					this.platform.log.debug(`${this.accessory.displayName} - Polling error: ${error}`)
				}
			}
		}, pollingInterval * 1000)
	}

	/**
	 * Stop background polling
	 */
	private stopPolling() {
		if (this.pollingTimer) {
			clearInterval(this.pollingTimer)
			this.pollingTimer = undefined
		}
	}

	/**
	 * Poll VM state and update HomeKit if changed
	 */
	private async pollState() {
		if (!this.isNodeReady) {
			return
		}

		try {
			const previousState = this.state
			await this.fetchState(true) // Bypass cache for polling

			// If state changed, update HomeKit
			if (this.state !== previousState) {
				this.service.updateCharacteristic(this.platform.Characteristic.On, this.state)
				if (this.platform.config.debug) {
					this.platform.log.debug(`${this.accessory.displayName} - State changed to ${this.state} (polling)`)
				}
			}
		} catch (error) {
			// Don't log errors too frequently for polling - fetchState already handles logging
			if (this.platform.config.debug) {
				this.platform.log.debug(`${this.accessory.displayName} - Poll failed: ${error}`)
			}
		}
	}
}
