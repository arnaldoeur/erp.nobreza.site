import { DailyClosure } from '../types';
import { api } from './api';

/**
 * Fechos de caixa.
 *
 * A diferença entre o total do sistema e o numerário contado é recalculada
 * no servidor. Antes vinha calculada do browser, o que permitia gravar um
 * fecho aparentemente certo com valores que não batiam.
 */

function toClosure(raw: any): DailyClosure {
    return {
        ...raw,
        closureDate: new Date(raw.closureDate),
        createdAt: new Date(raw.createdAt),
    } as DailyClosure;
}

export const ClosureService = {
    getAll: async (): Promise<DailyClosure[]> => {
        const closures = await api.get<any[]>('/closures');
        return closures.map(toClosure);
    },

    add: async (closure: DailyClosure): Promise<DailyClosure> => {
        return toClosure(await api.post<any>('/closures', {
            closureDate: closure.closureDate,
            shift: closure.shift,
            responsibleName: closure.responsibleName,
            systemTotal: closure.systemTotal,
            manualCash: closure.manualCash,
            observations: closure.observations,
            status: closure.status,
        }));
    },
};
