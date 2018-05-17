import implementInterface from "~/core/tools/graphql/implementInterface";
import ResourceStub from "~/core/schema/ResourceStub";
import Representation, { representationInterface } from "~/core/schema/Representation";
import Resource from "~/core/schema/Resource";

export default implementInterface("Description", "description",
    () => [Representation, Resource, ResourceStub], representationInterface);
