// Only fixed, public messages belong here. Never attach upstream response bodies.
export class ServiceError extends Error {
    constructor(code, status, message) {
        super(message);
        this.name = "ServiceError";
        this.code = code;
        this.status = status;
    }
}
