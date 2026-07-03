namespace Rambler.Server.Socket.Processors
{
    using Contracts.Responses;
    using Socket;
    using System.Threading.Tasks;

    public class ReactionResponseProcessor : IResponseProcesor<ReactionResponse>
    {
        private readonly SocketSubscriptions subs;

        public ReactionResponseProcessor(SocketSubscriptions subs)
        {
            this.subs = subs;
        }

        public async Task Process(Response<ReactionResponse> response)
        {
            await subs.Publish(response);
        }
    }
}
