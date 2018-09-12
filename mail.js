let nodemailer = require("nodemailer")
const conf = require("./conf.json")
const PRIORITY = require("./priority")

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: conf.email.from,
        pass: conf.email.password
    }
})

function createMailOptions(content, priority) {
    let subject = conf.email.title
    
    if (priority === PRIORITY.NORMAL) {
        subject = subject + " Priorité Normale"
    } else if (priority === PRIORITY.HIGH) {
        subject = subject + "Priorité HAUTE"
    }

    return {
        from: conf.email.from,
        to: conf.email.to,
        subject: subject,
        text: content
    }
}

function sendEmail(content, priority) {
    transporter.sendMail(createMailOptions(content, priority), function (error, info)  {
        if (error) {
            console.log(error)
        } else {
            console.log("Email sent !")
        }
    })
}

module.exports = {
    sendEmail
}