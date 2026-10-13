export function getSystemStatus() {
    return {
        status: "online",
        aiService: "operacional",
        database: "conectado"
    };
}

export function getCustomerData(customerId) {
    return {
        customerId: customerId,
        name: "Cliente de Teste",
        status: "ativo",
    };

}