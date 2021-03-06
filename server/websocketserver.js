const WebSocket = require('ws')
const TimeManager = require('./assets/timemanager.js')

/**
 * Serveur de WebSocket
 * @property {WebSocket.Server} ws : instance du serveur
 * @property {Database} database : instance du gestionnaire de base de données
 * @property {TimeManager} timeManager : instance du gestionnaire de TimeSlot
 * @property {Array} socketList : Tableau listant les sockets qui se connectent
 */
class WebSocketServer {
  constructor (server) {
    this.ws = new WebSocket.Server({ server })
    this.database = null
    this.timeManager = new TimeManager()
    this.socketList = []
    this.init()
  }

  /**
   * Enregistrement du gestionnaire de base de données
   * @param {Database} Database : gestionnaire de base de données
   */
  registerDataBase (Database) {
    this.database = Database
    return this.updateTimeManager()
  }

  /**
   * Mise à jour des timeSlots et de la pile du timeManager
   */
  updateTimeManager () {
    return this.database.getTimeSlotsFromDB()
      .then((response) => this.timeManager.init(response))
  }

  /**
   * Initialisation du serveur de WebSocket
   */
  init () {
    this.ws.on('connection', (socket) => {
      this.updateTimeManager()
      this.socketList.push(socket)
        
      socket.on('message', (message) => {
        message = JSON.parse(message)
        this.route(socket, message)
      })

      socket.on('close', () => {
        this.socketList = this.socketList.filter(s => s !== socket)
      })
    })
  }

  /**
   * Routage des messages reçus
   * @param {WebSocket} socket : socket émetteur d'un message
   * @param {WebSocket.Data} message : message reçu par WS
   */
  route (socket, message) {
    switch (message.head) {
      // Ajout de la nouvelle commande passée
      case 'newOrder':
        return this.database.addOrder(message.datas).then((response) => {
          if (!response.warningStatus) {
            const changedSlot = this.timeManager.setSlotUsed(message.datas)
            this.database.setTimeSlots(changedSlot)

            // Notification des clients pour mettre à jour leurs timeSlot et aux pizzaïlos leurs commandes
            this.socketList.forEach(so => {
              so.send(JSON.stringify({ head: 'updateSlotsRequired' }))
            })
          } else {
            console.error('Erreur lors de l\'enregistrement de la commande en base de données.')
          }
        })

      // Récupération des timeSlots de disponibles
      case 'getTimeSlots':
        return new Promise(resolve => {
          let arrSlot
          if (message.datas)
            arrSlot = this.timeManager.getAvailableTimeSlots(message.datas)
          else
            arrSlot = this.timeManager.getAvailableTimeSlots()
          socket.send(JSON.stringify({ "head": "updateSlots", "datas": arrSlot }))
          resolve()
        })

      // Récupération des commandes
      case 'getOrders':
        return this.database.getOrders().then((response) => {
          socket.send(JSON.stringify({ head: 'updateOrders', datas: this.timeManager.requestOrdToArray(response) }))
        })

      // Mise à jour de l'état d'une commande
      case 'setState':
        return this.database.setState(message.datas.idOrder, message.datas.state).then((response) => {
          if (!response.warningStatus) {
            this.socketList.forEach(so => {
              so.send(JSON.stringify({ head: 'updateState', datas: { idOrder: message.datas.idOrder, state: message.datas.state } }))
            })
          } else {
            console.error('Erreur lors de la mise à jour en base de données de l\'état de la commande.')
          }
        })

      default:
        console.error('Cas non traité.')
        break
    }
  }
}

module.exports = WebSocketServer
