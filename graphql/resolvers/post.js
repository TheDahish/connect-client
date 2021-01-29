const Post = require("../../models/Post");
const checkAuth = require("../../utel/checkAuth");
const { AuthenticationError, UserInputError } = require("apollo-server");

module.exports = {
  Query: {
    async getPost(_, { postid }) {
      try {
        const post = await Post.findById(postid);
        if (post) {
          return post;
        } else {
          throw new Error("post not found");
        }
      } catch (e) {
        throw new Error("test");
      }
    },
    async getPosts() {
      try {
        const posts = await Post.find().sort({ createdAt: -1 });
        return posts;
      } catch (err) {
        throw new Error(err);
      }
    },
  },
  Mutation: {
    async createPost(_, { body }, context) {
      const user = checkAuth(context);
      if (body.trim() == "") {
        throw new Error("Post body must not be empty");
      }
      const newPost = new Post({
        body,
        user: user.id,
        username: user.username,
        createdAt: new Date().toISOString(),
      });

      const post = await newPost.save();
      context.pubsub.publish("NEW_POST", {
        newPost: post,
      });
      return post;
    },
    async deletePost(_, { postid }, context) {
      const user = checkAuth(context);
      try {
        const post = await Post.findById(postid);
        if (user.username === post.username) {
          await post.delete();
          return "Post Deleted";
        } else {
          throw new AuthenticationError("Not allowed");
        }
      } catch (e) {
        throw new Error(e);
      }
    },
    async likePost(_, { postid }, context) {
      const { username } = checkAuth(context);

      const post = await Post.findById(postid);

      if (post) {
        if (post.likes.find((like) => like.username === username)) {
          //post already liked
          post.likes = post.likes.filter((like) => like.username !== username);
        } else {
          post.likes.push({ username, createdAt: new Date().toISOString });
        }
        await post.save();
        return post;
      } else throw new UserInputError("Post not found ");
    },
  },
  Subscription: {
    newPost: {
      subscribe: (__, _, { pubsub }) => pubsub.asyncIterator("NEW_POST"),
    },
  },
};