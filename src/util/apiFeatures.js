class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  multfilter() {
    const searchQuery = (this.queryString.q || '').toLowerCase();

    console.log('Search Query:', searchQuery); // Log the search query

    if (typeof searchQuery === 'string' && searchQuery.length > 0) {
      const regexSearch = {
        $or: [
          { name: { $regex: searchQuery, $options: 'i' } },
          { category: { $regex: searchQuery, $options: 'i' } },
          { status: { $regex: searchQuery, $options: 'i' } },
        ],
      };

      this.query = this.query.find(regexSearch);
    }

    // console.log('Query after applying regex search:', this.query); // Log the query
    return this;
  }

  filter() {
    const qeuryObj = { ...this.queryString };
    const excludeFields = ['pages', 'sort', 'limit', 'fields'];
    excludeFields.forEach((el) => delete qeuryObj[el]);

    // 1B Advanced Filtering
    let queryStr = JSON.stringify(qeuryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    console.log(JSON.parse(queryStr));

    this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-publishedAt');
    }
    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }
    return this;
  }

  pagination() {
    const pages = this.queryString.pages * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (pages - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
