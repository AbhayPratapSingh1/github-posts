import request from "./client.js"

export const getUsers = () => request("/users")