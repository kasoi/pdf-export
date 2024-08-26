import nodemailer from 'nodemailer'


    const mailer = nodemailer.createTransport({
    host: process.env.SMTP,
    port: parseInt(process.env.SMTP_PORT),
    secure: true,
        auth: {
            user: process.env.MAILUSER,
            pass: process.env.MAILPASS,
        }
    });


const createMailOptions = (subject, text) => ({
  from: process.env.MAILUSER,
  to: process.env.RECIPIENTS.split(' '),
  subject: subject,
  text: text,
});

const sendMail = async (subject, text) => {

    try {
        await mailer.sendMail(createMailOptions(subject, text));
    }
    catch(error) {
        console.log('failed to send email notification, reason:', error);
    }

}

export const notifySubmissionSuccess = async (posterId) => {
    await sendMail(
        `[DONE] Submission ${posterId} has been processed`,
        "");
}

export const notifySubmissionFailed = async (posterId, submissionId, email, reason) => {
    await sendMail(
        `[FAILED] Submission ${posterId} has failed to be processed`,
        `id: ${submissionId}\nposter: ${posterId}\ne-mail: ${email}\nreason: ${reason}`);
}

export const notifySubmissionFailResolve = async (posterId) => {
    await sendMail(
        `[RESOLVED] Submission ${posterId} has finally been processed after a failure`,
        ``);
}