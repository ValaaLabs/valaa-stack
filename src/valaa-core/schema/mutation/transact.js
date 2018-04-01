import { GraphQLString, GraphQLObjectType, GraphQLInputObjectType, GraphQLNonNull }
    from "graphql/type";

import mutationInputField from "~/valaa-core/tools/graphql/mutationInputField";
import mutationPayloadField from "~/valaa-core/tools/graphql/mutationPayloadField";
import transacted from "~/valaa-core/command/transacted";

const TransactMutationInput = new GraphQLInputObjectType({
  name: "TransactMutationInput",
  fields: {
    ...mutationInputField("clientMutationId", new GraphQLNonNull(GraphQLString)),
    ...mutationInputField("actions", new GraphQLNonNull(GraphQLString)),
  },
});

const TransactMutationPayload = new GraphQLObjectType({
  name: "TransactMutationPayload",
  fields: {
    ...mutationPayloadField("clientMutationId", new GraphQLNonNull(GraphQLString)),
  },
});

const transact = {
  type: TransactMutationPayload,
  description: "Elementary transact",
  args: {
    input: { type: new GraphQLNonNull(TransactMutationInput) },
  },
  resolve: async (context, args/* , info */) => {
    try {
      const transactedCommand = transacted(JSON.parse(args.input.actions));
      transactedCommand.blobStubs = context.blobStubs;
      const command = await context.store.dispatch(transactedCommand);
      return {
        clientMutationId: command.id,
      };
    } catch (error) {
      console.error(error.message, error.stack);
      throw error;
    }
  },
};

export default transact;
