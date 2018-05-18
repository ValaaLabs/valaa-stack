import implementInterface from "~/raem/tools/graphql/implementInterface";
import ResourceStub from "~/raem/schema/ResourceStub";
import Representation, { representationInterface } from "~/raem/schema/Representation";
import Resource from "~/raem/schema/Resource";

export default implementInterface("Description", "description",
    () => [Representation, Resource, ResourceStub], representationInterface);
