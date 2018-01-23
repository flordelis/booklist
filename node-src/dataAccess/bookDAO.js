import { ObjectId } from "mongodb";
import DAO from "./dao";

import moment from "moment";
import path from "path";
import fs from "fs";
import AWS from "aws-sdk";
AWS.config.region = "us-east-1";

class BookDAO extends DAO {
  constructor(userId) {
    super();
    this.userId = userId;
  }

  async offlineSync({ page, pageSize }) {
    let db = await super.open();
    let userIdToUse = this.userId;

    let skip = (page - 1) * pageSize;
    let limit = +pageSize + 1;

    try {
      let query = { userId: userIdToUse };
      let sortObj = { _id: -1 };

      let allFields = ["_id", "title", "isbn", "smallImage", "subjects", "authors", "tags", "isRead"];
      let project = allFields.reduce((hash, key) => ((hash[key] = 1), hash), {});
      try {
        let books = (await db
          .collection("books")
          .aggregate([{ $match: query }, { $project: project }, { $sort: sortObj }, { $skip: skip }, { $limit: limit }])
          .toArray())
          .map(adjustForClient)
          .map(b => {
            delete b.dateAdded;
            delete b.publicationDate;
            return b;
          });

        return { books };
      } catch (err) {
        console.log(err);
      }
    } finally {
      super.dispose(db);
    }
  }

  async saveBook(book) {
    let db = await super.open();
    try {
      book.userId = this.userId;
      let result = await db.collection("books").insert(book);

      super.confirmSingleResult(result);
    } finally {
      super.dispose(db);
    }
  }
  async saveManual(book) {
    let db = await super.open();
    try {
      let bookToInsert = {};
      bookToInsert.userId = this.userId;

      //coming right from the client, so we'll sanitize
      const validProperties = ["title", "isbn", "pages", "publisher", "publicationDate"];
      validProperties.forEach(prop => (bookToInsert[prop] = (book[prop] || "").substr(0, 500)));
      bookToInsert.authors = (book.authors || []).filter(a => a).map(a => ("" + a).substr(0, 500));

      if (bookToInsert.pages || bookToInsert.pages === "0") {
        bookToInsert.pages = +bookToInsert.pages;
      } else {
        delete bookToInsert.pages;
      }

      if (book.smallImage) {
        try {
          let smallImageSavedToAws = await this.saveToAws(book.smallImage);
          bookToInsert.smallImage = smallImageSavedToAws;
        } catch (err) {
          //for now just proceed and save the rest of the book
        }
      }

      let result = await db.collection("books").insert(bookToInsert);

      super.confirmSingleResult(result);
    } finally {
      super.dispose(db);
    }
  }
  saveToAws(webPath) {
    return new Promise((res, rej) => {
      fs.readFile("." + webPath, (err, data) => {
        if (err) return rej(err);

        let s3bucket = new AWS.S3({ params: { Bucket: "my-library-cover-uploads" } }),
          params = {
            Key: `bookCovers/${this.userId}/${path.basename(webPath)}`,
            Body: data
          };

        s3bucket.upload(params, function(err) {
          if (err) rej(err);
          else res(`http://my-library-cover-uploads.s3-website-us-east-1.amazonaws.com/${params.Key}`);
        });
      });
    });
  }
  async deleteBook(id) {
    let db = await super.open();
    try {
      await db.collection("books").remove({ _id: ObjectId(id), userId: this.userId });
    } finally {
      super.dispose(db);
    }
  }
  async update(book) {
    let db = await super.open();
    try {
      //coming right from the client, so we'll sanitize
      const validProperties = ["title", "isbn", "pages", "publisher", "publicationDate"];

      let $set = {};
      validProperties.forEach(prop => {
        let val = book[prop] || "";
        if (prop === "pages") {
          let pagesVal = val || val === "0" ? +val : "";
          $set[prop] = pagesVal;
        } else if (typeof val === "string") {
          $set[prop] = val.substr(0, 500);
        }
      });
      $set.authors = (book.authors || []).filter(a => a).map(a => ("" + a).substr(0, 500));

      if (book.smallImage) {
        try {
          let smallImageSavedToAws = await this.saveToAws(book.smallImage);
          $set.smallImage = smallImageSavedToAws;
        } catch (err) {
          console.log(err);
          //for now just proceed and save the rest of the book
        }
      }

      await db.collection("books").update({ _id: ObjectId(book._id), userId: this.userId }, { $set });
    } finally {
      super.dispose(db);
    }
  }
  async setBooksTags(books, add, remove) {
    let db = await super.open();
    try {
      await db
        .collection("books")
        .update(
          { _id: { $in: books.map(_id => ObjectId(_id)) }, userId: this.userId },
          { $addToSet: { tags: { $each: add || [] } } },
          { upsert: false, multi: true }
        );

      await db
        .collection("books")
        .update(
          { _id: { $in: books.map(_id => ObjectId(_id)) }, userId: this.userId },
          { $pullAll: { tags: remove || [] } },
          { upsert: false, multi: true }
        );
    } catch (errr) {
      console.log(errr);
    } finally {
      super.dispose(db);
    }
  }
  async setRead(_ids, isRead) {
    let db = await super.open();
    await db.collection("books").update({ _id: { $in: _ids.map(_id => ObjectId(_id)) }, userId: this.userId }, { $set: { isRead } }, { multi: true });
  }

  async loadBookDetails(_id) {
    let db = await super.open();
    let book = await db.collection("books").findOne({ userId: this.userId, _id: ObjectId(_id) });
    return book;
  }
}

function adjustForClient(book) {
  book.dateAdded = +book._id.getTimestamp();
  if (/\d{4}-\d{2}-\d{2}/.test(book.publicationDate)) {
    book.publicationDate = moment(book.publicationDate).format("MMMM Do YYYY");
  }
  if (/http:\/\/my-library-cover-uploads/.test(book.smallImage)) {
    book.smallImage =
      "https://s3.amazonaws.com/my-library-cover-uploads/" +
      book.smallImage.replace(/http:\/\/my-library-cover-uploads.s3-website-us-east-1.amazonaws.com\//, "");
  }
  return book;
}

export default BookDAO;
