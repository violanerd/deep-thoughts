const { User, Thought } = require('../models');
const { AuthenticationError } = require('apollo-server-express');
const { signToken } = require('../utils/auth')

const resolvers = {
    Query: {
        thoughts: async(parent, {username}) => {
            //checks to see if there is a username or not
            const params = username ? {username} : {};
            return Thought.find(params).sort({createdAt: -1});
        },
        thought: async (parent, {_id}) => {
            return Thought.findOne({_id})
        },
        users: async() => {
            return User.find()
            .select('-__v -password')
            .populate('friends')
            .populate('thoughts')
        },
        user: async(parent, {username}) => {
            return User.findOne({username})
            .select('-__v -password')
            .populate('friends')
            .populate('thoughts')
        },
        me: async(parent, args, context) => {
            if (context.user){
                const userData = await User.findOne({_id: context.user._id})
                .select('-__v -password')
                .populate('thoughts')
                .populate('friends')

                return userData
            }
            throw new AuthenticationError("not logged in")
        }
    },
    Mutation: {
        addUser: async (parent, args) => {
            const user = await User.create(args);
            const token = signToken(user);
            return {user, token};
        },
        login: async (parent, {email, password}) => {
            const user = await User.findOne({email});

            if (!user){
                throw new AuthenticationError('Incorrect Credentials')
            }

            const correctPw = await user.isCorrectPassword(password);

            if (!correctPw){
                throw new AuthenticationError('Incorrect Credentials')
            }

            const token = signToken(user);
            return {user, token};
        },
        addThought: async(parent, args, context)=>{
            if(context.user){
                const thought = await Thought.create({ ...args, username: context.user.username})
                await User.findByIdAndUpdate(
                    {_id: context.user._id},
                    { $push: {thoughts: thought._id}},
                    { new: true})
                return thought;
            }
            throw new AuthenticationError("you need to be logged in!")   
        },
        addReaction: async(parent, {thoughtId, reactionBody}, context) => {
            if(context.user){
                const updatedThought = await Thought.findByIdAndUpdate(
                    {_id: thoughtId},
                    {$push: { reactions: { reactionBody, username: context.user.username } } },
                    { new: true, runValidators: true}
                )
                return updatedThought;
            }
            throw new AuthenticationError("you need to be logged in!")
        },
        addFriend: async(parent, {friendId}, context) => {
            if (context.user){
                const updatedUser = await User.findByIdAndUpdate(
                    {_id: context.user._id},
                    {$addToSet: { friends: friendId}},
                    {new: true}
                ).populate('friends')
                return updatedUser;
            }
            throw new AuthenticationError("you need to be logged in!")
        }
    }
}

module.exports = resolvers;