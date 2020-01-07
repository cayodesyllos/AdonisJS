"use strict";
const Env = use("Env");
const moment = require("moment");
const User = use("App/Models/User");
const crypto = require("crypto");
const Mail = use("Mail");
class ForgotPasswordController {
  async store({ request, response }) {
    try {
      const email = request.input("email");
      const user = await User.findByOrFail("email", email);

      user.token = crypto.randomBytes(10).toString("hex");
      user.token_created_at = new Date();

      await user.save();
      await Mail.send(
        ["emails.forgot_password"],
        {
          token: user.token,
          link: `${request.input("redirect_url")}?token=${user.token}`
        },
        message => {
          message
            .to(user.email)
            .from(`${Env.get("EMAIL_FROM")}`, "___*__*___")
            .subject("Forgot your password");
        }
      );
    } catch (error) {
      return response.status(error.status).send({
        error: { message: "It looks like the email is incorrect" }
      });
    }
  }

  async update({ request, response }) {
    try {
      const { token, new_password } = request.all();
      const user = await User.findByOrFail("token", token);

      const token_expired = moment()
        .subtract("2", "days")
        .isAfter(user.token_created_at);

      if (token_expired) {
        return response.status(401).send({
          error: { message: "The token is expired" }
        });
      } else {
        user.token = null;
        user.token_created_at = null;
        user.password = new_password;

        await user.save();
      }
    } catch (error) {
      return response.status(error.status).send({
        error: { message: "Something went wrong" }
      });
    }
  }
}

module.exports = ForgotPasswordController;
