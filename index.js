// Dépendances
const conf = require("./conf.json")
const leboncoin = require("leboncoin-api")
const PRIORITY = require("./priority")
const mail = require("./mail")

// Utilitaires
const timer = ms => new Promise(resolve => setTimeout(resolve, ms))

// Variables globales
let checkCounter = 0
let now = Date.now()
let advertsSent = []


/**
 * Formatte les code postaux de la configuration pour leboncoin
 */
function formatZipCodes() {
    let zipcodes = conf.search.criteria.location.zipcodes;

    return zipcodes.map(zipcode => {
        return {"zipcode" : zipcode}
    })
}

/**
 * Formatte la trance de prix de la configuration pour leboncoin
 */
function formatPrice() {
    return {min : conf.search.criteria.price.min, max : conf.search.criteria.price.max}
}

/**
 * Construit la recherche
 */
function buildSearch() {
    return new leboncoin.Search()
        .setCategory("locations")
        .setRegion("nord_pas_de_calais")
        .setLocation(formatZipCodes())
        .addSearchExtra("price", formatPrice())
}

/**
 * Retourne true si l'annonce est apparue après le démarrage du service
 * @param {*} advertDetails - les détails d'une annonce
 */
function hasAdvertAppearedAfterStartup(advertDetails) {
    return Date.parse(advertDetails.details.index_date) > now
}

/**
 * Retourne true si l'annonce est prise en compte
 * @param {*} advertDetails - les détails d'une annonce
 */
function takeInChargeAdvert(advertDetails) {
    let advertTimeStamp = Date.parse(advertDetails.details.index_date)

    let diff = (Date.now() - advertTimeStamp) / 1000 / 60 / 24
    return diff >= 0 && diff <= (conf.search.props.acceptDaysBeforeToday * 24)
}

/**
 * Retourne true si l'annonce a déjà été envoyée par mail
 * @param {*} advertDetails  - les détails d'une annonce
 */
function isAdvertAlreadySent(advertDetails) {
    return advertsSent.indexOf(advertDetails.link) !== -1;
}

/**
 * Envoie les détails de l'annonce par mail
 * @param {*} advertDetails - les détails de l'annonce
 * @param {*} priority - la priorité du mail
 */
function sendEmail(advertDetails, priority) {
    console.log("Sending new email to " + conf.email.to)
    mail.sendEmail(advertDetails.link, priority)
    console.log(advertDetails.link)
    advertsSent.push(advertDetails.link)
}

/**
 * Analyse les résultats de la recherche
 * @param {Object} searchResult - les résultats de la recherche
 */
function parseSearchResults(searchResult) {
    console.log("Résultats de la recherche")
    console.log("Page courante : " + searchResult.page)
    console.log("Nombre de pages : " + searchResult.pages)
    console.log("Nombre de résultats : " + searchResult.nbResult)

    //searchResult.results = [searchResult.results[0]]
    //searchResult.results = [searchResult.results[0], searchResult.results[1]]

    searchResult.results.forEach(result => {
        result.getDetails().then(details => {
            let priority = PRIORITY.LOW
            //console.log(details)

            if (hasAdvertAppearedAfterStartup(details)) {
                //console.log("After startup")
                priority = PRIORITY.HIGH
            } else {
                if (takeInChargeAdvert(details)) {
                    //console.log("take in charge")
                    priority = PRIORITY.NORMAL;
                }
            }

            if (priority > PRIORITY.LOW) {
                if (!isAdvertAlreadySent(details)) {
                    sendEmail(details, priority)
                }
            }
        }, err => {
            console.error(err);
            })
        
    })
}

/**
 * Starts a new search
 */
function newSearch(checkTimer) {
    const today = new Date().toLocaleString();
    console.log(today + " - Recherche " + checkCounter++)

    // Le nombre maximum de recherches a été atteint
    if (conf.search.props.limit !== -1 && checkCounter === conf.search.props.limit) {
        return
    }

    buildSearch().run()
        .then(data => {
            parseSearchResults(data)
            timer(checkTimer).then(_ => newSearch(checkTimer))
        }, err => {
            console.error(err);
            timer(checkTimer).then(_ => newSearch(checkTimer))
        })
}

/**
 * Service pour trouver un appartement sur leboncoin
 */
function main() {
    // Conversion en ms
    newSearch(parseInt(conf.search.props.timer) * 60 * 1000)
}
 
main()