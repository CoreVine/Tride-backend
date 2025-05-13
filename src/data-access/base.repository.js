class BaseRepository {
    constructor(model) {
        this.model = model;
    }

    async findById(id, options = {}) {
        return this.model.findByPk(id, options);
    }

    async findOne(options = {}) {
        return this.model.findOne(options);
    }

    async findAll(options = {}) {
        return this.model.findAll(options);
    }

    async create(data, options = {}) {
        return this.model.create(data, options);
    }

    async update(id, data, options = {}) {
        const [updated] = await this.model.update(data, {
            where: { [this.model.primaryKeyAttribute]: id },
            ...options
        });
        return updated > 0;
    }

    async delete(id, options = {}) {
        return this.model.destroy({
            where: { [this.model.primaryKeyAttribute]: id },
            ...options
        });
    }

    async deleteWhere(whereClause, options = {}) {
        return this.model.destroy({
            where: {
                ...whereClause
            },
            ...options
        });
    }
    
    async findFiltered(whereClause = {}, sortOrder = [['created_at', 'DESC']], options = {}) {
        return await this.model.findAll({
            ...options,
            where: whereClause,
            order: sortOrder
        });
    }
    
    // New methods for common operations
    async findAllPaginated(page = 1, limit = 10, options = {}) {
        const offset = (page - 1) * limit;
        
        const { count, rows } = await this.model.findAndCountAll({
            ...options,
            limit,
            offset,
            distinct: true
        });
        
        return { count, rows };
    }
    
    async findWithPagination(whereClause = {}, page = 1, limit = 10, sortOrder = [['created_at', 'DESC']], options = {}) {
        const offset = (page - 1) * limit;
        
        const { count, rows } = await this.model.findAndCountAll({
            ...options,
            where: whereClause,
            limit,
            offset,
            order: sortOrder,
            distinct: true
        });
        
        return { count, rows };
    }
    
    async count(whereClause = {}) {
        return await this.model.count({ where: whereClause });
    }
    
    async bulkCreate(records, options = {}) {
        return await this.model.bulkCreate(records, options);
    }
}

module.exports = BaseRepository;
