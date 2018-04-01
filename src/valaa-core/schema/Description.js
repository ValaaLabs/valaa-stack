import implementInterface from "~/valaa-core/tools/graphql/implementInterface";
import ResourceStub from "~/valaa-core/schema/ResourceStub";
import Representation, { representationInterface } from "~/valaa-core/schema/Representation";
import Resource from "~/valaa-core/schema/Resource";

export default implementInterface("Description", "description",
    () => [Representation, Resource, ResourceStub], representationInterface);
