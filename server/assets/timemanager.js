/**
 * Gestionnaire des timeSlots
 * @property {Map} timeslots : Map représentant le couple [horaire : disponibilité]
 * @property {Array} pile : Tableau contenant l'ensemble des horaires de retrait pour une journée de travail
 */
class TimeManager {
  constructor () {
    this.timeslots = new Map()
    this.pile = []
  }

  /**
   * Initialisation des propriétés de la classe
   * @param {Array} datas : tableau d'objet { horaire, disponibilité }
   */
  init (datas) {
    this.pile = []
    this.timeslots = new Map()
    for (const iterator of datas) {
      this.timeslots.set(iterator.hour, iterator.used)
      this.pile.push(iterator.hour)
    }
  }

  /**
   * Mets à jour les slots utilisés par la nouvelle commande
   * @param {Object} order : Objet contenant l'ensemble des informations de la nouvelle commande
   * @returns {Array} : tableau listant les nom des slots modifiés
   */
  setSlotUsed (order) {
    const changedSlots = []
    const index = this.pile.indexOf(order.timeSlot)
    for (let i = index; i > index - order.totalQty; i--) {
      this.timeslots.set(this.pile[i], 1)
      changedSlots.push(this.pile[i])
    }
    return changedSlots
  }

  /**
   * Récupère l'ensemble des horaires de retrait possibles pour une quantité de pizzas donnée
   * @param {Number} qtyPizzas : quantité de pizza pour la commande
   * @returns {Array} : tableau contenant l'ensemble des horaires possibles
   */
  getAvailableTimeSlots (qtyPizzas = 1) {
    const availableSlots = []
    if (this.getEmptySlots().length >= qtyPizzas) { // Si il y au moins autant de slots disponibles que de pizzas en commande
      let newPile = this.checkCurrentHour(this.pile)
      for (let i = 0; i < newPile.length; i++) {
        if (i + qtyPizzas <= newPile.length) { // Si il y a suffisamment de slot suivant (si l'on est pas à la fin de la pile)
          let isEnoughSpace = true
          const studySlot = []

          for (let y = i; y < i + qtyPizzas; y++) { // Vérifie si les 'qtyPizzas' slots suivants sont disponibles
            if (this.timeslots.get(newPile[y])) {
              isEnoughSpace = false
              break
            }
            studySlot.push(newPile[y])
          }

          if (isEnoughSpace) // Si on a trouvé assez d'espace
            availableSlots.push(studySlot[studySlot.length - 1]) // On ajoute le dernier slot, correspondant à l'horaire de retrait possible de la commande
        }
      }
    }
    return availableSlots
  }

  /**
   * Supprime, dans un tableau d'horaire, ceux dont l'heure est déjà passée
   * @param {Array} arrTS : tableau d'horaire
   * @returns {Array} : tableau filtré avec les horaires possibles
   */
  checkCurrentHour (arrTS) {
    const newArr = []
    arrTS.forEach(timeslot => {
      const hour = new Date().getUTCHours().toString().length < 2 ? '0' + (new Date().getUTCHours() + 1) : new Date().getUTCHours() + 1
      const minutes = new Date().getUTCMinutes().toString().length < 2 ? '0' + new Date().getUTCMinutes() : new Date().getUTCMinutes()
      const time = `${hour}:${minutes}`

      if (time < timeslot)
        newArr.push(timeslot)
    })
    return newArr
  }

  /**
 * Retourne tous les slots non occupé (sans commande) de this.timeslots
 * @returns {Array} : tableau contenant les horaires diponibles
 */
  getEmptySlots () {
    const emptySlots = []
    for (const [time, available] of this.timeslots) {
      if (!available)
        emptySlots.push(time)
    }
    return emptySlots
  }

  /**
   * Formate le résultat de la requête SQL en un tableau (de tableau pour les pizzas)
   * @param {Array} dbResult : résultat de la requête SQL
   * @returns {Array} : Tableau formaté pour la mise à jour côté client
   */
  requestOrdToArray (dbResult) {
    const arr = []
    for (const line of dbResult) {
      const check = arr.find(el => el.idOrder === line.idOrder)
      if (check !== undefined) {
        check.pizzas.push({
          name: line.name,
          qty: line.qty
        })
      } else {
        arr.push({
          idOrder: line.idOrder,
          lastName: line.lastName,
          firstName: line.firstName,
          phone: line.phone,
          state: line.state,
          price: line.price,
          timeSlot: line.timeSlot,
          pizzas: [{
            name: line.name,
            qty: line.qty
          }]
        })
      }
    }
    return arr
  }
}

module.exports = TimeManager
